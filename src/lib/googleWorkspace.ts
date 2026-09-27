import * as XLSX from 'xlsx';
import { Exam, StudentSubmission } from '../types';

declare global {
  interface Window {
    google?: {
      accounts: {
        oauth2: {
          initTokenClient: (config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: any }) => void;
          }) => {
            requestAccessToken: (overrideConfig?: { prompt?: string; hint?: string; login_hint?: string }) => void;
          };
        };
      };
    };
  }
}

export const TARGET_ADMIN_GOOGLE_ACCOUNT = 'lapassessment1@gmail.com';
export const GOOGLE_OAUTH_CLIENT_ID = '87582254229-1b44jrp233e6vlvfncodo1gr0paim6h9.apps.googleusercontent.com';
export const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file';

let cachedAccessToken: string | null = null;
let tokenExpiresAt = 0;
let connectedUserEmail: string | null = null;

export function getConnectedGoogleEmail(): string | null {
  return connectedUserEmail || localStorage.getItem('apogee_connected_google_email');
}

export function setConnectedGoogleEmail(email: string) {
  connectedUserEmail = email;
  localStorage.setItem('apogee_connected_google_email', email);
}

export async function getGoogleAccessToken(forcedEmail: string = TARGET_ADMIN_GOOGLE_ACCOUNT): Promise<string> {
  if (cachedAccessToken && Date.now() < tokenExpiresAt) {
    return cachedAccessToken;
  }

  return new Promise((resolve, reject) => {
    if (!window.google?.accounts?.oauth2) {
      reject(new Error('Google Identity Services script not yet loaded. Please check your internet connection.'));
      return;
    }

    try {
      const tokenClient = window.google.accounts.oauth2.initTokenClient({
        client_id: GOOGLE_OAUTH_CLIENT_ID,
        scope: GOOGLE_SCOPES,
        callback: async (resp) => {
          if (resp.error) {
            reject(new Error(typeof resp.error === 'string' ? resp.error : JSON.stringify(resp.error)));
            return;
          }
          if (resp.access_token) {
            cachedAccessToken = resp.access_token;
            tokenExpiresAt = Date.now() + 50 * 60 * 1000;

            // Fetch authenticated user info
            try {
              const userInfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              if (userInfoRes.ok) {
                const info = await userInfoRes.json();
                if (info.email) {
                  setConnectedGoogleEmail(info.email);
                }
              }
            } catch {
              setConnectedGoogleEmail(forcedEmail);
            }

            resolve(resp.access_token);
          } else {
            reject(new Error('No access token received from Google authorization.'));
          }
        },
      });

      // Target the specified admin account
      tokenClient.requestAccessToken({
        prompt: 'select_account',
        hint: forcedEmail,
        login_hint: forcedEmail,
      });
    } catch (err) {
      reject(err);
    }
  });
}

/**
 * Generates the 2 distinct Excel worksheets required:
 * Sheet 1: Student Details & Candidate Registration Info
 * Sheet 2: Question Response & Answer Matrix with Total Marks
 */
export function buildExcelWorksheets(exam: Exam, submissions: StudentSubmission[]) {
  const dateStr = new Date().toISOString().split('T')[0];
  const branchClean = (exam.targetBranch || 'GENERAL').replace(/[^a-zA-Z0-9]/g, '');
  const sectionClean = (exam.targetSection || 'SEC-ALL').replace(/[^a-zA-Z0-9]/g, '');
  const fileName = `${branchClean}_${dateStr}_${sectionClean}`;

  // 1. Sheet 1 Data: Student Registration Details
  const sheet1Data: any[] = [
    [
      'Student Name',
      'Roll Number',
      'Email Address',
      'Branch',
      'Section',
      'Year',
      'Exam Code',
      'Exam Title',
      'Score',
      'Total Marks',
      'Percentage (%)',
      'Violations Count',
      'Proctoring Status',
      'Submission Timestamp',
    ],
  ];

  submissions.forEach((sub) => {
    sheet1Data.push([
      sub.student.fullName,
      sub.student.rollNumber,
      sub.student.email,
      sub.student.branch,
      sub.student.section,
      sub.student.year,
      exam.code,
      exam.title,
      sub.score,
      sub.totalQuestions,
      `${sub.percentage.toFixed(1)}%`,
      sub.violationsCount,
      sub.violationsCount >= (exam.maxViolations || 3)
        ? 'FLAGGED (VIOLATION LIMIT)'
        : sub.violationsCount > 0
        ? `WARNING (${sub.violationsCount})`
        : 'CLEAN / VERIFIED',
      new Date(sub.submittedAt).toLocaleString(),
    ]);
  });

  // 2. Sheet 2 Data: Question-by-Question Response Matrix
  const sheet2Headers: string[] = ['Candidate Name', 'Roll Number'];
  exam.questions.forEach((q, idx) => {
    sheet2Headers.push(`Q${idx + 1}: ${q.text.substring(0, 35)}... (Answer Selected)`);
    sheet2Headers.push(`Q${idx + 1} Status`);
  });
  sheet2Headers.push('Total Marks Gained', 'Max Marks', 'Final Percentage');

  const sheet2Data: any[] = [sheet2Headers];

  submissions.forEach((sub) => {
    const row: any[] = [sub.student.fullName, sub.student.rollNumber];

    exam.questions.forEach((q) => {
      const selectedIndex = sub.answers[q.id];
      if (selectedIndex !== undefined && selectedIndex >= 0) {
        const optionLetter = ['A', 'B', 'C', 'D'][selectedIndex] || 'N/A';
        const optionText = q.options[selectedIndex] || '';
        const isCorrect = selectedIndex === q.correctAnswer;
        row.push(`${optionLetter}: ${optionText}`);
        row.push(isCorrect ? 'CORRECT (+1)' : 'INCORRECT (0)');
      } else {
        row.push('UNANSWERED');
        row.push('SKIPPED (0)');
      }
    });

    row.push(sub.score);
    row.push(sub.totalQuestions);
    row.push(`${sub.percentage.toFixed(1)}%`);
    sheet2Data.push(row);
  });

  return { fileName, sheet1Data, sheet2Data };
}

/**
 * Download native Excel file (.xlsx) with the 2 Sheets locally
 */
export function downloadOfflineExcel(exam: Exam, submissions: StudentSubmission[]) {
  const { fileName, sheet1Data, sheet2Data } = buildExcelWorksheets(exam, submissions);

  const workbook = XLSX.utils.book_new();
  const ws1 = XLSX.utils.aoa_to_sheet(sheet1Data);
  const ws2 = XLSX.utils.aoa_to_sheet(sheet2Data);

  XLSX.utils.book_append_sheet(workbook, ws1, 'Student Details');
  XLSX.utils.book_append_sheet(workbook, ws2, 'Response & Marks Matrix');

  XLSX.writeFile(workbook, `${fileName}.xlsx`);
}

/**
 * Creates Google Spreadsheet in faculty Google Drive (lapassessment1@gmail.com) and populates both sheets
 * Named: [Branch]_[Date]_[Section]
 */
export async function exportToGoogleDriveAndSheets(
  exam: Exam,
  submissions: StudentSubmission[],
  targetEmail: string = TARGET_ADMIN_GOOGLE_ACCOUNT
): Promise<{ spreadsheetUrl: string; spreadsheetId: string; fileName: string; targetEmail: string }> {
  const token = await getGoogleAccessToken(targetEmail);
  const { fileName, sheet1Data, sheet2Data } = buildExcelWorksheets(exam, submissions);

  // 1. Create Spreadsheet with two sheets
  const createResp = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      properties: {
        title: fileName,
      },
      sheets: [
        {
          properties: {
            title: 'Candidate Details',
            gridProperties: { rowCount: Math.max(sheet1Data.length + 10, 50), columnCount: 20 },
          },
        },
        {
          properties: {
            title: 'Answers & Marks Matrix',
            gridProperties: {
              rowCount: Math.max(sheet2Data.length + 10, 50),
              columnCount: Math.max((sheet2Data[0]?.length || 10) + 5, 25),
            },
          },
        },
      ],
    }),
  });

  if (!createResp.ok) {
    const errorBody = await createResp.text();
    throw new Error(`Failed to create Google Spreadsheet: ${errorBody}`);
  }

  const sheetObj = await createResp.json();
  const spreadsheetId = sheetObj.spreadsheetId;
  const spreadsheetUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

  // 2. Populate Sheet 1 (Candidate Details)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Candidate Details'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: sheet1Data,
      }),
    }
  );

  // 3. Populate Sheet 2 (Answers & Marks Matrix)
  await fetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/'Answers & Marks Matrix'!A1?valueInputOption=USER_ENTERED`,
    {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: sheet2Data,
      }),
    }
  );

  // 4. Set permissions so the spreadsheet can be opened smoothly
  try {
    await fetch(`https://www.googleapis.com/drive/v3/files/${spreadsheetId}/permissions`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        role: 'reader',
        type: 'anyone',
      }),
    });
  } catch {
    // Permission setting optional
  }

  return {
    spreadsheetUrl,
    spreadsheetId,
    fileName,
    targetEmail,
  };
}
