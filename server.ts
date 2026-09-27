import express from 'express';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
const PORT = Number(process.env.PORT) || 3000;

app.use(express.json());

// Helper to auto-detect provider by API key signature
function detectProvider(apiKey: string): 'gemini' | 'anthropic' | 'groq' | 'openrouter' | 'deepseek' | 'openai' {
  const k = (apiKey || '').trim();
  if (k.startsWith('AIzaSy')) return 'gemini';
  if (k.startsWith('sk-ant-')) return 'anthropic';
  if (k.startsWith('gsk_')) return 'groq';
  if (k.startsWith('sk-or-')) return 'openrouter';
  if (k.startsWith('sk-') && k.length === 35) return 'deepseek';
  return 'openai';
}

// Comprehensive topic-aware curriculum synthesis engine
function synthesizeCurriculumQuestions(
  topic: string,
  coverage: string,
  count: number,
  difficulty: string,
  branch: string
) {
  const lowerTopic = (topic || '').toLowerCase();
  const lowerCoverage = (coverage || '').toLowerCase();
  const safeCount = Math.max(1, Math.min(count || 5, 50));
  const questions: any[] = [];

  const addQ = (
    text: string,
    options: [string, string, string, string],
    correctAnswer: 0 | 1 | 2 | 3,
    explanation: string,
    codeSnippet?: string
  ) => {
    questions.push({
      id: `q_acad_${Date.now()}_${questions.length + 1}`,
      text,
      options,
      correctAnswer,
      explanation,
      topic,
      codeSnippet,
    });
  };

  // 1. MACHINE LEARNING, AI, DEEP LEARNING, DATA SCIENCE
  if (
    lowerTopic.includes('machine learning') ||
    lowerTopic.includes('deep learning') ||
    lowerTopic.includes('artificial intelligence') ||
    /\bai\b/.test(lowerTopic) ||
    lowerTopic.includes('neural') ||
    lowerTopic.includes('nlp') ||
    lowerTopic.includes('computer vision')
  ) {
    const pool = [
      {
        text: `In "${topic}" (${coverage || 'model optimization'}), which regularisation technique adds the L1 norm of weights to the loss function to enforce feature sparsity?`,
        options: [
          'Lasso Regularisation (L1)',
          'Ridge Regularisation (L2)',
          'Dropout with probability p=0.5',
          'Batch Normalisation with running variance',
        ],
        correctAnswer: 0,
        explanation: 'L1 regularisation penalizes absolute values of coefficients, driving non-essential feature weights strictly to zero.',
      },
      {
        text: `When training deep networks under "${coverage}", what mathematical problem occurs when gradients approach zero across many layers during backpropagation?`,
        options: [
          'Exploding Gradient Problem',
          'Vanishing Gradient Problem',
          'Internal Covariate Shift',
          'Catastrophic Forgetting',
        ],
        correctAnswer: 1,
        explanation: 'The vanishing gradient problem occurs when successive chain rule multiplications of small derivatives cause early layer gradients to shrink exponentially.',
      },
      {
        text: `In evaluating a classifier on an imbalanced dataset in "${topic}", which metric represents the harmonic mean of Precision and Recall?`,
        options: ['ROC-AUC Score', 'Matthews Correlation', 'F1-Score', 'Brier Score'],
        correctAnswer: 2,
        explanation: 'The F1-Score is mathematically defined as 2 * (Precision * Recall) / (Precision + Recall).',
      },
      {
        text: `Which architectural mechanism in Transformer models allows parallel computation across sequence positions without recurrent hidden states?`,
        options: [
          'Bidirectional LSTM Cell',
          'Multi-Head Self-Attention with Scaled Dot-Product',
          'Residual Convolutional Gating',
          'Max-Pooling Pyramid',
        ],
        correctAnswer: 1,
        explanation: 'Self-attention calculates pairwise token interactions in O(1) sequential steps using Query, Key, and Value matrices.',
      },
      {
        text: `Under ${difficulty} difficulty in ${topic}, which optimizer uses exponentially decaying averages of past squared gradients alongside momentum?`,
        options: ['SGD without momentum', 'Adam (Adaptive Moment Estimation)', 'Adagrad', 'RMSprop without first moment'],
        correctAnswer: 1,
        explanation: 'Adam computes adaptive learning rates for each parameter by maintaining both first and second moment estimates.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 2. COMPUTER NETWORKS, PROTOCOLS, CYBERSECURITY
  else if (
    lowerTopic.includes('network') ||
    lowerTopic.includes('tcp') ||
    lowerTopic.includes('ip') ||
    lowerTopic.includes('routing') ||
    lowerTopic.includes('subnet') ||
    lowerTopic.includes('cyber') ||
    lowerTopic.includes('security') ||
    lowerTopic.includes('crypto')
  ) {
    const pool = [
      {
        text: `In "${topic}" regarding "${coverage || 'transport protocols'}", how does the TCP Three-Way Handshake establish a reliable connection?`,
        options: [
          'SYN -> SYN-ACK -> ACK',
          'ACK -> SYN -> SYN-ACK',
          'FIN -> ACK -> FIN-ACK',
          'RST -> SYN -> ACK',
        ],
        correctAnswer: 0,
        explanation: 'TCP connection establishment sequence begins with SYN from client, SYN-ACK from server, followed by final ACK from client.',
      },
      {
        text: `Given an IPv4 subnet mask of 255.255.255.224 (/27), what is the maximum number of usable host addresses in each subnetwork?`,
        options: ['62 hosts', '30 hosts', '32 hosts', '14 hosts'],
        correctAnswer: 1,
        explanation: '32 total bits - 27 prefix bits = 5 host bits. 2^5 = 32. Subtracting 2 (network ID & broadcast address) gives 30 usable hosts.',
      },
      {
        text: `In asymmetric cryptography applicable to "${topic}", which mathematical problem guarantees security in the RSA cryptosystem?`,
        options: [
          'Discrete Logarithm Problem in finite fields',
          'Difficulty of factoring large prime products (Integer Factorization)',
          'Elliptic Curve Isogeny Computation',
          'NP-Complete Hamiltonian Cycle verification',
        ],
        correctAnswer: 1,
        explanation: 'RSA relies on the computational difficulty of decomposing a large composite number n into its prime factors p and q.',
      },
      {
        text: `Which layer of the OSI model is responsible for logical routing, IP addressing, and packet fragmentation?`,
        options: ['Data Link Layer (Layer 2)', 'Network Layer (Layer 3)', 'Transport Layer (Layer 4)', 'Session Layer (Layer 5)'],
        correctAnswer: 1,
        explanation: 'The Network Layer handles host-to-host packet delivery, path determination, and logical addressing (IPv4/IPv6).',
      },
      {
        text: `Under "${coverage}", which TCP congestion control phase exponentially increases the congestion window (cwnd) until the slow start threshold (ssthresh) is reached?`,
        options: ['Congestion Avoidance', 'Slow Start', 'Fast Recovery', 'Selective Acknowledgement'],
        correctAnswer: 1,
        explanation: 'During Slow Start, the sender doubles cwnd every round-trip time (RTT) for every ACK received.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 3. DATABASE MANAGEMENT SYSTEMS (DBMS), SQL, DATA STORAGE
  else if (
    lowerTopic.includes('database') ||
    lowerTopic.includes('sql') ||
    lowerTopic.includes('dbms') ||
    lowerTopic.includes('nosql') ||
    lowerTopic.includes('rdbms') ||
    lowerTopic.includes('transaction')
  ) {
    const pool = [
      {
        text: `In relational database theory for "${topic}", which normal form requires the relation to be in 2NF and have NO transitive functional dependencies?`,
        options: ['First Normal Form (1NF)', 'Third Normal Form (3NF)', 'Boyce-Codd Normal Form (BCNF)', 'Fourth Normal Form (4NF)'],
        correctAnswer: 1,
        explanation: '3NF states that no non-prime attribute may depend transitively on any candidate key of the relation.',
      },
      {
        text: `In ACID properties governing "${coverage || 'transactions'}", which property ensures that once committed, transaction updates persist even in the event of power loss?`,
        options: ['Atomicity', 'Consistency', 'Isolation', 'Durability'],
        correctAnswer: 3,
        explanation: 'Durability guarantees that committed modifications are written to non-volatile storage (WAL / data files) and will survive crashes.',
      },
      {
        text: `Why are B+ Trees preferred over standard Binary Search Trees for disk-based database indexes?`,
        options: [
          'High fan-out minimizes disk I/O operations by maintaining shallow tree height',
          'B+ Trees store all actual record keys exclusively in internal branch nodes',
          'Binary search trees eliminate all pointer overhead completely',
          'B+ Trees avoid any need for node rebalancing upon insertions',
        ],
        correctAnswer: 0,
        explanation: 'B+ Trees have large branching factors (fan-out), allowing millions of records to be indexed with only 3 to 4 disk page reads.',
      },
      {
        text: `Which SQL isolation level prevents both Dirty Reads and Non-Repeatable Reads, but may still permit Phantom Reads under ANSI SQL-92?`,
        options: ['Read Uncommitted', 'Read Committed', 'Repeatable Read', 'Serializable'],
        correctAnswer: 2,
        explanation: 'Repeatable Read holds read locks until transaction completion, preventing non-repeatable reads but allowing phantom inserts unless range locks are applied.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 4. DATA STRUCTURES & ALGORITHMS (DSA)
  else if (
    lowerTopic.includes('tree') ||
    lowerTopic.includes('graph') ||
    lowerTopic.includes('data structure') ||
    lowerTopic.includes('algorithm') ||
    lowerTopic.includes('sorting') ||
    lowerTopic.includes('dynamic program')
  ) {
    const pool = [
      {
        text: `In "${topic}" regarding "${coverage || 'balancing'}", what is the strict balance factor condition maintained by an AVL Tree for every node?`,
        options: [
          'Height difference of left and right subtrees must be in {-1, 0, +1}',
          'Depth of all leaf nodes must be identical across levels',
          'The number of left children must equal the number of right children',
          'All nodes must have exactly two distinct child pointers',
        ],
        correctAnswer: 0,
        explanation: 'An AVL tree requires that for every node, |height(left) - height(right)| <= 1.',
      },
      {
        text: `What is the tightest worst-case asymptotic runtime for Merge Sort when sorting an array of n elements?`,
        options: ['O(n)', 'O(n log n)', 'O(n^2)', 'O(log n)'],
        correctAnswer: 1,
        explanation: 'Merge sort divides the list in half recursively (log n levels) and performs O(n) work per level, guaranteeing O(n log n) even in the worst case.',
      },
      {
        text: `In graph theory applied to "${coverage}", which algorithm efficiently computes Single-Source Shortest Paths in graphs with non-negative edge weights?`,
        options: ["Dijkstra's Algorithm", "Bellman-Ford Algorithm", "Floyd-Warshall Algorithm", "Kruskal's Algorithm"],
        correctAnswer: 0,
        explanation: "Dijkstra's algorithm with a min-priority queue achieves O((V + E) log V) for non-negative weights.",
      },
      {
        text: `Which traversal order of a Binary Search Tree (BST) yields keys in strictly ascending sorted order?`,
        options: ['Pre-order (Root, Left, Right)', 'In-order (Left, Root, Right)', 'Post-order (Left, Right, Root)', 'Level-order (BFS)'],
        correctAnswer: 1,
        explanation: 'In-order traversal visits the left subtree, then the root node, and finally the right subtree, producing ascending values.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 5. OPERATING SYSTEMS, SYSTEM PROGRAMMING
  else if (
    lowerTopic.includes('operating system') ||
    /\bos\b/.test(lowerTopic) ||
    lowerTopic.includes('process scheduling') ||
    lowerTopic.includes('deadlock') ||
    lowerTopic.includes('virtual memory') ||
    lowerTopic.includes('linux kernel') ||
    lowerTopic.includes('semaphore')
  ) {
    const pool = [
      {
        text: `In "${topic}", which of the following is NOT one of the four Coffman conditions necessary for a system deadlock?`,
        options: ['Mutual Exclusion', 'Preemption Allowed', 'Hold and Wait', 'Circular Wait'],
        correctAnswer: 1,
        explanation: 'Preemption allowed actually breaks deadlock. The necessary condition is No Preemption.',
      },
      {
        text: `In virtual memory systems covering "${coverage}", what phenomenon occurs when a computer spends more time paging than executing processes?`,
        options: ['Thrashing', 'External Fragmentation', 'Deadlock Inversion', 'Belady’s Anomaly'],
        correctAnswer: 0,
        explanation: 'Thrashing occurs when the total working sets exceed physical memory, causing continuous page faults and disk swapping.',
      },
      {
        text: `Which CPU scheduling algorithm is provably optimal in minimizing average waiting time for a given set of stationary processes?`,
        options: ['First-Come, First-Served (FCFS)', 'Shortest Job First (SJF)', 'Round Robin (RR)', 'Priority Scheduling without preemption'],
        correctAnswer: 1,
        explanation: 'Shortest Job First (SJF) schedules shorter jobs first, which mathematically minimizes the cumulative waiting time.',
      },
      {
        text: `What is the key functional difference between a binary semaphore and a mutex lock?`,
        options: [
          'A mutex has an ownership concept (only the locking thread can unlock it), whereas a semaphore does not',
          'A binary semaphore can only be used on single-core architectures',
          'A mutex cannot prevent race conditions in multithreaded code',
          'A binary semaphore requires busy-waiting spin loops exclusively',
        ],
        correctAnswer: 0,
        explanation: 'Mutexes have ownership semantics (locking thread must unlock), whereas semaphores can be signaled by any thread.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 6. ELECTRONICS, DIGITAL LOGIC, VLSI, MICROPROCESSORS
  else if (
    lowerTopic.includes('electronic') ||
    lowerTopic.includes('vlsi') ||
    lowerTopic.includes('digital logic') ||
    lowerTopic.includes('microprocessor') ||
    lowerTopic.includes('embedded') ||
    lowerTopic.includes('circuit') ||
    lowerTopic.includes('signal')
  ) {
    const pool = [
      {
        text: `In "${topic}" regarding "${coverage || 'digital circuits'}", what is the setup time (t_setup) of a flip-flop?`,
        options: [
          'The minimum time data must remain stable BEFORE the active clock edge',
          'The minimum time data must remain stable AFTER the active clock edge',
          'The total propagation delay from clock edge to Q output',
          'The clock pulse width required to clear internal gates',
        ],
        correctAnswer: 0,
        explanation: 'Setup time is the minimum duration the data input must be stable prior to the arrival of the clock edge to avoid metastability.',
      },
      {
        text: `In microprocessor architecture applicable to "${topic}", what distinguishes the Harvard architecture from the Von Neumann architecture?`,
        options: [
          'Separate physical buses and memory spaces for instructions and data',
          'Unified single memory bus for both instructions and data',
          'Elimination of arithmetic logic units (ALU)',
          'Exclusive reliance on asynchronous clocking',
        ],
        correctAnswer: 0,
        explanation: 'Harvard architecture utilizes physically separate memory pathways for program code and data, eliminating the Von Neumann bus bottleneck.',
      },
      {
        text: `Which logic gate family is characterized by negligible static power dissipation and high noise immunity?`,
        options: ['TTL (Transistor-Transistor Logic)', 'ECL (Emitter-Coupled Logic)', 'CMOS (Complementary MOS)', 'RTL (Resistor-Transistor Logic)'],
        correctAnswer: 2,
        explanation: 'CMOS circuits draw virtually zero static current because one transistor in each complementary pair is always OFF during steady state.',
      },
      {
        text: `In Karnaugh Map (K-map) minimization for "${coverage}", why are adjacent cells mapped using Gray code sequence?`,
        options: [
          'Only a single binary variable changes state between adjacent cells',
          'It maximizes arithmetic addition speed in binary adders',
          'It eliminates all propagation delays in combinational logic',
          'It converts analog voltage levels into digital words',
        ],
        correctAnswer: 0,
        explanation: 'Gray code ensures that adjacent squares differ by exactly one variable (Hamming distance 1), enabling visual grouping.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 7. MECHANICAL, THERMODYNAMICS, FLUID MECHANICS
  else if (
    lowerTopic.includes('thermodynamic') ||
    lowerTopic.includes('fluid') ||
    lowerTopic.includes('heat transfer') ||
    lowerTopic.includes('mechanical') ||
    lowerTopic.includes('kinematics') ||
    lowerTopic.includes('stress') ||
    lowerTopic.includes('strength')
  ) {
    const pool = [
      {
        text: `In "${topic}" regarding "${coverage || 'energy cycles'}", what does the Second Law of Thermodynamics state regarding entropy in an isolated system?`,
        options: [
          'The entropy of an isolated system always increases or remains constant in a reversible process (dS >= 0)',
          'Energy can neither be created nor destroyed in any physical process',
          'Absolute zero temperature can be achieved in a finite number of steps',
          'Thermal efficiency of any heat engine can reach 100% at high pressure',
        ],
        correctAnswer: 0,
        explanation: 'The Second Law dictates that the entropy of an isolated system never decreases; natural spontaneous processes increase total entropy.',
      },
      {
        text: `In fluid mechanics covering "${coverage}", which dimensionless number represents the ratio of inertial forces to viscous forces?`,
        options: ['Reynolds Number (Re)', 'Prandtl Number (Pr)', 'Nusselt Number (Nu)', 'Mach Number (Ma)'],
        correctAnswer: 0,
        explanation: 'Reynolds number Re = (rho * v * L) / mu predicts whether fluid flow will be laminar or turbulent.',
      },
      {
        text: `Under "${topic}", which ideal thermodynamic cycle forms the basis for theoretical maximum efficiency between two temperature reservoirs?`,
        options: ['Carnot Cycle', 'Rankine Cycle', 'Brayton Cycle', 'Otto Cycle'],
        correctAnswer: 0,
        explanation: 'The Carnot cycle consists of two reversible isothermal and two reversible adiabatic processes, achieving maximum theoretical efficiency.',
      },
      {
        text: `In mechanics of materials, what is the point on the stress-strain curve beyond which plastic deformation occurs permanently?`,
        options: ['Yield Point (Yield Strength)', 'Proportional Limit', 'Ultimate Tensile Strength', 'Fracture Point'],
        correctAnswer: 0,
        explanation: 'Beyond the yield point, Hooke’s law ceases to apply and the material experiences non-recoverable plastic deformation.',
      },
    ];
    for (let i = 0; i < safeCount; i++) {
      const q = pool[i % pool.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  // 8. GENERAL / CUSTOM TOPIC ADAPTIVE SYNTHESIS
  else {
    const cleanTopic = topic.trim();
    const cleanCoverage = coverage.trim() || 'Core Principles & Implementation';

    const customTemplates = [
      {
        text: `In "${cleanTopic}" (focusing on "${cleanCoverage}"), what is the primary operational objective when configuring boundary parameters at ${difficulty} level?`,
        options: [
          `Ensuring deterministic state validation and invariant preservation under peak load`,
          `Bypassing systematic integrity checks to accelerate raw execution speed`,
          `Restricting process execution to nondeterministic random memory offsets`,
          `Re-initializing the global application state from cold storage on every request`,
        ],
        correctAnswer: 0,
        explanation: `Under curriculum standards for "${cleanTopic}", robust architectures prioritize invariant preservation and state consistency.`,
      },
      {
        text: `When analyzing trade-offs in "${cleanTopic}" under "${cleanCoverage}", which factor most directly impacts throughput and stability?`,
        options: [
          `Resource allocation overhead and computational complexity scaling`,
          `Arbitrary delay injection into communication channels`,
          `Elimination of structured error logging and exception handling`,
          `Static hardcoding of environment credentials into runtime buffers`,
        ],
        correctAnswer: 0,
        explanation: `In "${cleanTopic}", asymptotic complexity and resource allocation overhead govern runtime scalability and overall stability.`,
      },
      {
        text: `Which architectural pattern or methodology is universally recommended when designing solutions for "${cleanTopic}"?`,
        options: [
          `Modular separation of concerns with explicit interface contracts`,
          `Monolithic global variable coupling across all subsystems`,
          `Unbounded asynchronous recursion without base termination conditions`,
          `Disabling hardware interrupts during high-frequency data streaming`,
        ],
        correctAnswer: 0,
        explanation: `Separation of concerns ensures testability, maintainability, and clean decoupling throughout "${cleanTopic}".`,
      },
      {
        text: `Under ${difficulty} requirements for "${cleanTopic}", what is the standard protocol for mitigating unexpected edge-case failure modes?`,
        options: [
          `Graceful degradation with fallback handlers and structured telemetry logging`,
          `Silent termination of process threads without user notification`,
          `Immediate unconditional hardware reboot upon detecting warnings`,
          `Overwriting faulty memory sectors with unverified randomized values`,
        ],
        correctAnswer: 0,
        explanation: `Production-ready engineering across "${cleanTopic}" demands defensive programming with graceful error fallbacks.`,
      },
      {
        text: `Regarding the scope of "${cleanCoverage}" in "${cleanTopic}", which assertion represents industry best practice?`,
        options: [
          `Continuous validation against domain constraints using automated verification suites`,
          `Assuming zero network latency and infinite hardware memory availability`,
          `Avoiding any code documentation or version control tracking`,
          `Coupling business logic directly to low-level hardware drivers`,
        ],
        correctAnswer: 0,
        explanation: `Automated verification and constraint validation are essential best practices for "${cleanTopic}".`,
      },
    ];

    for (let i = 0; i < safeCount; i++) {
      const q = customTemplates[i % customTemplates.length];
      addQ(q.text, q.options as any, q.correctAnswer as any, q.explanation);
    }
  }

  return questions;
}

// UNIVERSAL API KEY VERIFICATION ROUTE
app.post('/api/verify-api-key', async (req, res) => {
  const { provider, apiKey, customBaseUrl } = req.body;

  if (!apiKey || typeof apiKey !== 'string' || apiKey.trim().length < 8) {
    return res.status(400).json({
      success: false,
      error: 'Please enter a valid API Key to verify.',
    });
  }

  const key = apiKey.trim();
  const targetProvider = provider === 'auto' || !provider ? detectProvider(key) : provider;

  try {
    // 1. Google Gemini
    if (targetProvider === 'gemini') {
      const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`;
      const response = await fetch(url);
      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: Failed to authenticate with Google Gemini`;
        return res.status(400).json({
          success: false,
          provider: 'Google Gemini',
          error: errorMsg,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'Google Gemini',
        message: 'Google Gemini API key is valid and active!',
        modelUsed: 'gemini-3.8-flash',
      });
    }

    // 2. OpenAI
    if (targetProvider === 'openai') {
      const url = 'https://api.openai.com/v1/models';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: OpenAI authentication failed`;
        return res.status(400).json({
          success: false,
          provider: 'OpenAI',
          error: errorMsg,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'OpenAI',
        message: 'OpenAI API key is verified and operational!',
        modelUsed: 'gpt-4o-mini',
      });
    }

    // 3. Groq Cloud
    if (targetProvider === 'groq') {
      const url = 'https://api.groq.com/openai/v1/models';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: Groq authentication failed`;
        return res.status(400).json({
          success: false,
          provider: 'Groq Cloud',
          error: errorMsg,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'Groq Cloud',
        message: 'Groq Cloud API key is verified and ready!',
        modelUsed: 'llama-3.3-70b-versatile',
      });
    }

    // 4. Anthropic Claude
    if (targetProvider === 'anthropic') {
      const url = 'https://api.anthropic.com/v1/messages';
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          model: 'claude-3-5-haiku-latest',
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
      const data: any = await response.json();

      if (!response.ok && data?.error?.type === 'authentication_error') {
        return res.status(400).json({
          success: false,
          provider: 'Anthropic Claude',
          error: data?.error?.message || 'Invalid Anthropic API Key',
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'Anthropic Claude',
        message: 'Anthropic Claude API key is verified successfully!',
        modelUsed: 'claude-3-5-haiku-latest',
      });
    }

    // 5. DeepSeek
    if (targetProvider === 'deepseek') {
      const url = 'https://api.deepseek.com/models';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: DeepSeek authentication failed`;
        return res.status(400).json({
          success: false,
          provider: 'DeepSeek',
          error: errorMsg,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'DeepSeek',
        message: 'DeepSeek API key is verified and operational!',
        modelUsed: 'deepseek-chat',
      });
    }

    // 6. OpenRouter
    if (targetProvider === 'openrouter') {
      const url = 'https://openrouter.ai/api/v1/auth/key';
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await response.json();

      if (!response.ok) {
        const errorMsg = data?.error?.message || `HTTP ${response.status}: OpenRouter authentication failed`;
        return res.status(400).json({
          success: false,
          provider: 'OpenRouter',
          error: errorMsg,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'OpenRouter',
        message: 'OpenRouter API key is verified and active!',
        modelUsed: 'openai/gpt-4o-mini',
      });
    }

    // 7. Custom OpenAI-compatible Endpoint
    if (targetProvider === 'custom') {
      const baseUrl = (customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
      const url = `${baseUrl}/models`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${key}` },
      });
      const data: any = await response.json().catch(() => ({}));

      if (!response.ok) {
        return res.status(400).json({
          success: false,
          provider: 'Custom AI Provider',
          error: data?.error?.message || `HTTP ${response.status}: Could not connect to ${baseUrl}`,
        });
      }

      return res.status(200).json({
        success: true,
        provider: 'Custom AI Provider',
        message: `Connected successfully to custom endpoint at ${baseUrl}!`,
      });
    }

    return res.status(400).json({
      success: false,
      error: `Unsupported provider: ${targetProvider}`,
    });
  } catch (err: any) {
    return res.status(400).json({
      success: false,
      error: err.message || 'Network error while attempting to verify key with provider',
    });
  }
});

// UNIVERSAL QUESTION GENERATION ROUTE (Supports ANY API Provider)
app.post('/api/generate-questions', async (req, res) => {
  const {
    topic,
    coverage,
    count,
    difficulty,
    branch,
    provider,
    apiKey,
    customApiKey,
    customBaseUrl,
    customModel,
  } = req.body;

  const key = (customApiKey || apiKey || '').trim();
  const safeCount = Math.max(1, Math.min(count || 5, 30));

  const promptText = `You are a distinguished university professor and official examination board author.
Generate exactly ${safeCount} academically rigorous, topic-specific multiple-choice questions (MCQs) for an official university examination.

Topic: "${topic}"
Syllabus / Range: "${coverage || 'Fundamental concepts to advanced applications'}"
Target Branch: ${branch || 'Engineering'}
Difficulty: ${difficulty || 'Normal'}

CRITICAL REQUIREMENTS:
1. Every question must be directly related to "${topic}" and "${coverage}".
2. Provide exactly 4 distinct, plausible options (A, B, C, D) for each question.
3. correctAnswer must be an integer: 0 for A, 1 for B, 2 for C, 3 for D. Ensure correct answers are distributed across 0, 1, 2, and 3.
4. Provide a clear, educational explanation for each question.
5. If the topic involves code, algorithms, or queries, include a helpful codeSnippet.
6. Return ONLY a valid JSON array matching this exact schema without any markdown commentary:

[
  {
    "id": "q1",
    "text": "Detailed question text?",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why this answer is academically correct",
    "topic": "${topic}",
    "codeSnippet": ""
  }
]`;

  if (key && key.length >= 8) {
    const activeProvider = provider === 'auto' || !provider ? detectProvider(key) : provider;

    try {
      // 1. Google Gemini Provider
      if (activeProvider === 'gemini') {
        const ai = new GoogleGenAI({ apiKey: key });
        const response = await ai.models.generateContent({
          model: customModel || 'gemini-3.8-flash',
          contents: promptText,
          config: {
            temperature: 0.3,
            responseMimeType: 'application/json',
          },
        });

        if (response && response.text) {
          const cleanJson = response.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          const parsed = JSON.parse(cleanJson);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return res.status(200).json({
              success: true,
              source: 'gemini_api',
              provider: 'Google Gemini',
              questions: parsed,
            });
          }
        }
      }

      // 2. OpenAI / Groq / DeepSeek / OpenRouter / Custom OpenAI-Compatible
      if (['openai', 'groq', 'deepseek', 'openrouter', 'custom'].includes(activeProvider)) {
        let endpoint = 'https://api.openai.com/v1/chat/completions';
        let defaultModel = 'gpt-4o-mini';

        if (activeProvider === 'groq') {
          endpoint = 'https://api.groq.com/openai/v1/chat/completions';
          defaultModel = 'llama-3.3-70b-versatile';
        } else if (activeProvider === 'deepseek') {
          endpoint = 'https://api.deepseek.com/chat/completions';
          defaultModel = 'deepseek-chat';
        } else if (activeProvider === 'openrouter') {
          endpoint = 'https://openrouter.ai/api/v1/chat/completions';
          defaultModel = 'openai/gpt-4o-mini';
        } else if (activeProvider === 'custom') {
          const base = (customBaseUrl || 'http://localhost:11434/v1').replace(/\/+$/, '');
          endpoint = `${base}/chat/completions`;
          defaultModel = customModel || 'llama3';
        }

        const modelToUse = customModel || defaultModel;

        const aiResponse = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: modelToUse,
            messages: [
              {
                role: 'system',
                content:
                  'You are a university exam author. You MUST respond with ONLY a raw JSON array of questions matching the user schema.',
              },
              { role: 'user', content: promptText },
            ],
            temperature: 0.3,
          }),
        });

        const result: any = await aiResponse.json();

        if (!aiResponse.ok) {
          throw new Error(result?.error?.message || `HTTP ${aiResponse.status} from ${activeProvider}`);
        }

        const content = result.choices?.[0]?.message?.content || '';
        const cleanJson = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.status(200).json({
            success: true,
            source: `${activeProvider}_api`,
            provider: activeProvider.toUpperCase(),
            questions: parsed,
          });
        }
      }

      // 3. Anthropic Claude
      if (activeProvider === 'anthropic') {
        const aiResponse = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model: customModel || 'claude-3-5-haiku-latest',
            max_tokens: 4096,
            temperature: 0.3,
            messages: [{ role: 'user', content: promptText }],
          }),
        });

        const result: any = await aiResponse.json();
        if (!aiResponse.ok) {
          throw new Error(result?.error?.message || `HTTP ${aiResponse.status} from Anthropic`);
        }

        const content = result.content?.[0]?.text || '';
        const cleanJson = content.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);

        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'anthropic_api',
            provider: 'Anthropic Claude',
            questions: parsed,
          });
        }
      }
    } catch (err: any) {
      console.warn(`External API generation failed (${activeProvider}):`, err.message);
      return res.status(400).json({
        success: false,
        error: `${activeProvider.toUpperCase()} Error: ${err.message || 'Failed to generate questions. Verify API key and quota.'}`,
      });
    }
  }

  // Built-in environment Gemini if available
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'MY_GEMINI_API_KEY') {
    try {
      const ai = new GoogleGenAI();
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: promptText,
        config: {
          temperature: 0.3,
          responseMimeType: 'application/json',
        },
      });

      if (response && response.text) {
        const cleanJson = response.text.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
        const parsed = JSON.parse(cleanJson);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return res.status(200).json({
            success: true,
            source: 'gemini_api_env',
            provider: 'Google Gemini',
            questions: parsed,
          });
        }
      }
    } catch {
      // Fallback
    }
  }

  // Topic Curriculum Engine Synthesis
  const synthesized = synthesizeCurriculumQuestions(
    topic || 'Engineering Assessment',
    coverage || 'Core syllabus',
    count || 5,
    difficulty || 'Normal',
    branch || 'Computer Science'
  );

  return res.status(200).json({
    success: true,
    source: 'curriculum_engine',
    provider: 'Academic Curriculum Engine',
    questions: synthesized,
  });
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Exam Assessment Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
