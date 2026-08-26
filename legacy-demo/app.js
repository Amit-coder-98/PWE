(function () {
  "use strict";

  const STORAGE_KEY = "prabodhan_bag_demo_v1";
  const SESSION_KEY = "prabodhan_bag_demo_session";
  const STAGES = ["New", "Cutting", "Printing", "Stitching", "Packing", "Dispatched", "Completed"];
  const WORKFLOW = [
    { key: "booked", label: "Order Confirmed", mr: "ऑर्डर निश्चित", owner: "Order / CRM Manager" },
    { key: "material", label: "Material Ready", mr: "मटेरियल तयार", owner: "Material Storekeeper" },
    { key: "design", label: "Design", mr: "डिझाईन", owner: "Designer" },
    { key: "plate", label: "Plate Ready", mr: "प्लेट तयार", owner: "Plate Maker" },
    { key: "cutting", label: "Cutting", mr: "कटिंग", owner: "Cutting Operator" },
    { key: "printing", label: "Printing", mr: "प्रिंटिंग", owner: "Printing operator" },
    { key: "stitching", label: "Stitching", mr: "स्टिचिंग", owner: "Stitching Manager" },
    { key: "packing", label: "Packing", mr: "पॅकिंग", owner: "Packing / D.C. Manager" },
    { key: "challan", label: "Delivery Challan (D.C.)", mr: "डिलिव्हरी चलन", owner: "Packing / D.C. Manager" },
    { key: "billing", label: "Bill Created", mr: "बिल तयार", owner: "Accountant" },
    { key: "payment", label: "Payment Received", mr: "पेमेंट मिळाले", owner: "Accountant" },
    { key: "dispatch", label: "Dispatch", mr: "डिस्पॅच", owner: "Dispatch / Delivery Manager" },
    { key: "delivery", label: "Delivery Confirmed", mr: "डिलिव्हरी निश्चित", owner: "Dispatch / Delivery Manager" }
  ];

  const I18N = {
    en: {
      appName: "Prabodhan Bag", appSub: "Factory Operations Demo", loginTitle: "Welcome back",
      loginText: "Sign in to see how every order moves through the factory.", username: "Username",
      password: "Password", signIn: "Sign in to demo", demoAccounts: "Demo accounts", home: "Home",
      dashboard: "Dashboard", orders: "Orders", customers: "Customers", reports: "Reports", more: "More",
      newOrder: "New Order", quotations: "Quotations", materials: "Materials", billing: "Billing & Payments",
      workers: "Workers & Users", settings: "Settings", logout: "Log out", goodMorning: "Good morning",
      todayOverview: "Here is today’s simple factory overview.", todayOrders: "Today’s orders",
      activeOrders: "Active orders", dueToday: "Due today", pendingAmount: "Pending amount",
      productionStages: "Production stages", recentOrders: "Recent orders", viewAll: "View all",
      searchOrders: "Search order, party or bag type", all: "All", urgent: "Urgent", nextAction: "Next action",
      orderJourney: "Order journey", activity: "Activity history", completeStep: "Complete next step",
      addPayment: "Add payment", dispatch: "Mark dispatched", delivery: "Confirm delivery",
      returnOrder: "Record return", refund: "Issue refund", reset: "Reset demo data", restartTour: "Restart guided tour",
      language: "Language", english: "English", marathi: "मराठी", save: "Save", cancel: "Cancel",
      amount: "Amount", outstanding: "Outstanding", status: "Status", quantity: "Quantity", dueDate: "Due date",
      role: "Role", assignedStage: "Assigned stage", complete: "Complete", current: "Current", waiting: "Waiting",
      orderSaved: "Order created successfully", noOrders: "No orders match these filters.", clientDemo: "Client demo — sample data only",
      monthlyRevenue: "Monthly revenue", expenses: "Expenses", profit: "Net profit", production: "Production",
      lowStock: "Low stock", available: "Available", reorder: "Reorder level", statement: "Statement",
      createQuotation: "New quotation", trialNotice: "Offline prototype — no real data is changed",
      switchRole: "Switch demo role", tourSkip: "Skip tour", tourNext: "Next", tourBack: "Back", tourFinish: "Finish tour"
    },
    mr: {
      appName: "प्रबोधन बॅग", appSub: "फॅक्टरी व्यवस्थापन डेमो", loginTitle: "पुन्हा स्वागत आहे",
      loginText: "प्रत्येक ऑर्डर फॅक्टरीतून कशी पुढे जाते ते पाहण्यासाठी लॉगिन करा.", username: "युजरनेम",
      password: "पासवर्ड", signIn: "डेमोमध्ये लॉगिन करा", demoAccounts: "डेमो अकाउंट", home: "होम",
      dashboard: "डॅशबोर्ड", orders: "ऑर्डर्स", customers: "ग्राहक", reports: "रिपोर्ट", more: "अधिक",
      newOrder: "नवीन ऑर्डर", quotations: "कोटेशन", materials: "मटेरियल", billing: "बिल आणि पेमेंट",
      workers: "कामगार आणि युजर्स", settings: "सेटिंग्ज", logout: "लॉग आउट", goodMorning: "नमस्कार",
      todayOverview: "आजच्या फॅक्टरी कामाचा सोपा आढावा.", todayOrders: "आजच्या ऑर्डर्स",
      activeOrders: "चालू ऑर्डर्स", dueToday: "आज पूर्ण करायच्या", pendingAmount: "बाकी रक्कम",
      productionStages: "उत्पादन टप्पे", recentOrders: "अलीकडील ऑर्डर्स", viewAll: "सर्व पहा",
      searchOrders: "ऑर्डर, पार्टी किंवा बॅग प्रकार शोधा", all: "सर्व", urgent: "तातडीचे", nextAction: "पुढील काम",
      orderJourney: "ऑर्डरचा प्रवास", activity: "कामाचा इतिहास", completeStep: "पुढील टप्पा पूर्ण करा",
      addPayment: "पेमेंट नोंदवा", dispatch: "डिस्पॅच करा", delivery: "डिलिव्हरी निश्चित करा",
      returnOrder: "रिटर्न नोंदवा", refund: "रिफंड द्या", reset: "डेमो डेटा पुन्हा भरा", restartTour: "मार्गदर्शक टूर पुन्हा सुरू करा",
      language: "भाषा", english: "English", marathi: "मराठी", save: "जतन करा", cancel: "रद्द करा",
      amount: "रक्कम", outstanding: "बाकी", status: "स्थिती", quantity: "नग", dueDate: "देण्याची तारीख",
      role: "भूमिका", assignedStage: "नेमलेला टप्पा", complete: "पूर्ण", current: "सध्या", waiting: "प्रतीक्षा",
      orderSaved: "ऑर्डर यशस्वीपणे तयार झाली", noOrders: "या फिल्टरमध्ये ऑर्डर सापडली नाही.", clientDemo: "क्लायंट डेमो — फक्त नमुना डेटा",
      monthlyRevenue: "महिन्याचे उत्पन्न", expenses: "खर्च", profit: "निव्वळ नफा", production: "उत्पादन",
      lowStock: "कमी स्टॉक", available: "उपलब्ध", reorder: "पुन्हा मागवण्याची मर्यादा", statement: "स्टेटमेंट",
      createQuotation: "नवीन कोटेशन", trialNotice: "ऑफलाइन नमुना — खरा डेटा बदलत नाही",
      switchRole: "डेमो भूमिका बदला", tourSkip: "टूर बंद", tourNext: "पुढे", tourBack: "मागे", tourFinish: "टूर पूर्ण"
    }
  };

  const TOUR = [
    { route: "dashboard", selector: ".stats-grid", title: "A clear daily overview", mr: "दिवसभराचा सोपा आढावा", text: "Owners immediately see work, deadlines and pending money.", mrText: "मालकांना काम, मुदत आणि बाकी रक्कम लगेच दिसते." },
    { route: "dashboard", selector: ".status-strip", title: "Production at a glance", mr: "उत्पादन एका नजरेत", text: "Tap any stage count to focus on that part of the factory.", mrText: "कोणत्याही टप्प्यावर टॅप करून त्या कामावर लक्ष केंद्रित करा." },
    { route: "orders", selector: ".order-list", title: "Every order stays visible", mr: "प्रत्येक ऑर्डर स्पष्ट दिसते", text: "Search and filter by status, party or urgent work.", mrText: "स्थिती, पार्टी किंवा तातडीच्या कामानुसार शोधा." },
    { route: "order?id=ORD-2026-00125", selector: ".workflow", title: "Parallel preparation", mr: "समांतर तयारी", text: "Material and cutting progress alongside design and plate preparation before printing.", mrText: "प्रिंटिंगपूर्वी मटेरियल-कटिंग आणि डिझाईन-प्लेटची तयारी एकाच वेळी होते." },
    { route: "order?id=ORD-2026-00125", selector: ".next-action", title: "Stitching progress", mr: "स्टिचिंग प्रगती", text: "The Stitiching Manager sees a clear progress update and completion action.", mrText: "स्टिचिंग मॅनेजरला प्रगती अपडेट आणि पूर्ण करण्याचा पर्याय स्पष्ट दिसतो." },
    { route: "billing", selector: ".stats-grid", title: "Billing and payment", mr: "बिल आणि पेमेंट", text: "Bills, received amounts and outstanding balances stay together.", mrText: "बिल, मिळालेली रक्कम आणि बाकी एकाच ठिकाणी दिसते." },
    { route: "order?id=PB-1023", selector: ".detail-hero", title: "Delivery confirmation", mr: "डिलिव्हरी निश्चिती", text: "A completed order keeps its full production and delivery history.", mrText: "पूर्ण ऑर्डरचा उत्पादन आणि डिलिव्हरी इतिहास जतन राहतो." },
    { route: "reports", selector: ".stats-grid", title: "Results update automatically", mr: "रिपोर्ट आपोआप बदलतात", text: "Revenue, expenses, production and profit are simple to understand.", mrText: "उत्पन्न, खर्च, उत्पादन आणि नफा समजणे सोपे आहे." },
    { route: "orders?filter=Exceptions", selector: ".order-list", title: "Exceptions are not hidden", mr: "अडचणी लपवल्या जात नाहीत", text: "Shortages, overdue bills, returns and refunds are easy to find.", mrText: "स्टॉक कमी, थकबाकी, रिटर्न आणि रिफंड सहज सापडतात." },
    { route: "more", selector: ".menu-grid", title: "A simpler worker experience", mr: "कामगारांसाठी सोपा अनुभव", text: "Use Switch demo role to see the focused Printing Operator view.", mrText: "फक्त प्रिंटिंग ऑपरेटरला आवश्यक असलेली स्क्रीन पाहण्यासाठी डेमो भूमिका बदला." }
  ];

  function seedState() {
    const now = new Date();
    const iso = (days) => new Date(now.getTime() + days * 86400000).toISOString().slice(0, 10);
    const done = (...keys) => Object.fromEntries(keys.map((key, i) => [key, { done: true, at: `2026-08-${String(14 + i).padStart(2, "0")} 10:${String(i * 4).padStart(2, "0")}`, by: WORKFLOW.find(x => x.key === key)?.owner || "Team" }]));
    return {
      version: 3,
      settings: { language: "en", firmName: "Prabodhan Bag", tourEnabled: true },
      tourProgress: 0,
      notifications: [],
      users: [
        { id: "U1", name: "Rohan Patil", username: "admin@demo.com", password: "admin123", role: "Super Admin", assignedStage: "All process access", assignedSteps: [], active: true },
        { id: "U2", name: "Kavita Pawar", username: "order@demo.com", password: "admin123", role: "Order / CRM Manager", assignedStage: "Customers + order confirmation", assignedSteps: ["booked"], active: true },
        { id: "U3", name: "Dinesh More", username: "inventory@demo.com", password: "admin123", role: "Material / Inventory Manager", assignedStage: "Material availability", assignedSteps: ["material"], active: true },
        { id: "U4", name: "Riya Kulkarni", username: "designer@demo.com", password: "admin123", role: "Designer", assignedStage: "Design approval", assignedSteps: ["design"], active: true },
        { id: "U5", name: "Nitin Shinde", username: "cutting@demo.com", password: "admin123", role: "Cutting Manager", assignedStage: "Cutting", assignedSteps: ["cutting"], active: true },
        { id: "U6", name: "Ganesh Shinde", username: "plate@demo.com", password: "admin123", role: "Plate / Prepress Operator", assignedStage: "Plate preparation", assignedSteps: ["plate"], active: true },
        { id: "U7", name: "Meena Jadhav", username: "printing@demo.com", password: "admin123", role: "Printing Operator", assignedStage: "Printing", assignedSteps: ["printing"], active: true },
        { id: "U8", name: "Savita More", username: "stitching@demo.com", password: "admin123", role: "Stitching Manager", assignedStage: "Stitching", assignedSteps: ["stitching"], active: true },
        { id: "U9", name: "Prakash Jagtap", username: "packing@demo.com", password: "admin123", role: "Packing / D.C. Manager", assignedStage: "Packing + D.C.", assignedSteps: ["packing", "challan"], active: true },
        { id: "U10", name: "Asha Deshmukh", username: "accountant@demo.com", password: "admin123", role: "Accountant", assignedStage: "Billing + payment", assignedSteps: ["billing", "payment"], active: true },
        { id: "U11", name: "Mahesh Patil", username: "dispatch@demo.com", password: "admin123", role: "Dispatch / Delivery Manager", assignedStage: "Dispatch + delivery", assignedSteps: ["dispatch", "delivery"], active: true }
      ],
      customers: [
        { id: "C1", name: "Sahyadri Supermarket", company: "Sahyadri Retail Pvt. Ltd.", mobile: "9876501101", city: "Pune", gst: "27AABCS1101Q1Z2", outstanding: 18500 },
        { id: "C2", name: "Green Basket", company: "Green Basket Foods", mobile: "9876501102", city: "Nashik", gst: "27AABCG2202A1Z6", outstanding: 0 },
        { id: "C3", name: "Mahalaxmi Textiles", company: "Mahalaxmi Textiles", mobile: "9876501103", city: "Kolhapur", gst: "27AABCM3303B1Z8", outstanding: 42000 },
        { id: "C4", name: "Fresh Mart", company: "Fresh Mart Stores", mobile: "9876501104", city: "Satara", gst: "", outstanding: 7800 },
        { id: "C5", name: "Aarohi Boutique", company: "Aarohi Boutique", mobile: "9876501105", city: "Sangli", gst: "", outstanding: 0 }
      ],
      materials: [
        { id: "M1", name: "70 GSM White Fabric Roll", unit: "kg", stock: 185, reorder: 80 },
        { id: "M2", name: "90 GSM Red Fabric Roll", unit: "kg", stock: 42, reorder: 60 },
        { id: "M3", name: "Black Handle Patti", unit: "m", stock: 740, reorder: 250 },
        { id: "M4", name: "Printing Ink — Blue", unit: "litre", stock: 12, reorder: 8 },
        { id: "M5", name: "White Thread", unit: "cone", stock: 18, reorder: 20 }
      ],
      orders: [
        { id: "ORD-2026-00125", customerId: "C1", customer: "Sahyadri Supermarket", bagType: "Custom Printed D-Cut Bag", size: "14 × 18 in", gsm: "70", color: "Royal Blue", quantity: 500, rate: 85, total: 42500, paid: 24000, due: iso(2), priority: "Urgent", status: "Stitching", created: iso(-5), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing") }, stageData: { stitching: { completed: 320, total: 500, started: "2026-08-24 10:20", machine: "Stitch Line 2" } }, activity: [{ at: "2026-08-24 10:20", by: "Savita More", action: "Started stitching", detail: "320 / 500 bags completed" }, { at: "2026-08-23 16:42", by: "Meena Jadhav", action: "Completed printing", detail: "500 bags passed to stitching" }], notes: "Logo print in white; bundle in 100 pieces." },
        { id: "PB-1023", customerId: "C2", customer: "Green Basket", bagType: "Loop Handle Bag", size: "16 × 20 in", gsm: "90", color: "Leaf Green", quantity: 3000, rate: 12, total: 36000, paid: 36000, due: iso(-1), priority: "Normal", status: "Completed", created: iso(-9), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching", "packing", "challan", "billing", "payment", "dispatch", "delivery") } },
        { id: "PB-1022", customerId: "C3", customer: "Mahalaxmi Textiles", bagType: "Box Bag", size: "18 × 22 in", gsm: "90", color: "Red", quantity: 4000, rate: 14, total: 56000, paid: 14000, due: iso(5), priority: "Urgent", status: "Shortage", created: iso(-3), workflow: { ...done("booked", "design", "plate") }, notes: "Waiting for 90 GSM red material." },
        { id: "PB-1021", customerId: "C4", customer: "Fresh Mart", bagType: "W-Cut Carry Bag", size: "12 × 16 in", gsm: "60", color: "White", quantity: 2500, rate: 6.2, total: 15500, paid: 7700, due: iso(-4), priority: "Normal", status: "Overdue", created: iso(-12), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching", "packing", "challan", "billing", "dispatch") } },
        { id: "PB-1020", customerId: "C5", customer: "Aarohi Boutique", bagType: "Loop Handle Bag", size: "14 × 16 in", gsm: "80", color: "Pink", quantity: 1200, rate: 11, total: 13200, paid: 13200, due: iso(-7), priority: "Normal", status: "Returned", created: iso(-15), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching", "packing", "challan", "billing", "payment", "dispatch", "delivery") }, returnReason: "Print shade did not match approved sample." },
        { id: "PB-1019", customerId: "C3", customer: "Mahalaxmi Textiles", bagType: "D-Cut Non-Woven", size: "12 × 14 in", gsm: "70", color: "Black", quantity: 1000, rate: 8, total: 8000, paid: 8000, due: iso(-14), priority: "Normal", status: "Refunded", created: iso(-20), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching", "packing", "challan", "billing", "payment", "dispatch", "delivery") }, returnReason: "Order cancelled after delivery; full refund recorded." },
        { id: "PB-1025", customerId: "C4", customer: "Fresh Mart", bagType: "D-Cut Non-Woven", size: "10 × 14 in", gsm: "70", color: "Orange", quantity: 6000, rate: 7.8, total: 46800, paid: 10000, due: iso(7), priority: "Normal", status: "New", created: iso(0), workflow: { ...done("booked") } },
        { id: "PB-1018", customerId: "C1", customer: "Sahyadri Supermarket", bagType: "Box Bag", size: "20 × 24 in", gsm: "100", color: "Navy", quantity: 1800, rate: 18, total: 32400, paid: 20000, due: iso(1), priority: "Urgent", status: "Packing", created: iso(-8), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching") } },
        { id: "PB-1017", customerId: "C2", customer: "Green Basket", bagType: "W-Cut Carry Bag", size: "13 × 17 in", gsm: "65", color: "Green", quantity: 3500, rate: 6.8, total: 23800, paid: 12000, due: iso(3), priority: "Normal", status: "Stitching", created: iso(-6), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing") } },
        { id: "PB-1016", customerId: "C5", customer: "Aarohi Boutique", bagType: "Loop Handle Bag", size: "15 × 18 in", gsm: "85", color: "Beige", quantity: 1500, rate: 13, total: 19500, paid: 5000, due: iso(4), priority: "Normal", status: "Cutting", created: iso(-2), workflow: { ...done("booked", "material", "design", "plate") } },
        { id: "PB-1015", customerId: "C4", customer: "Fresh Mart", bagType: "D-Cut Non-Woven", size: "12 × 16 in", gsm: "70", color: "Yellow", quantity: 2800, rate: 8, total: 22400, paid: 12000, due: iso(1), priority: "Normal", status: "Dispatched", created: iso(-10), workflow: { ...done("booked", "material", "design", "plate", "cutting", "printing", "stitching", "packing", "challan", "billing", "payment", "dispatch") } }
      ],
      quotations: [
        { id: "QT-204", customer: "Omkar Pharmacy", quantity: 2500, rate: 9.5, total: 23750, valid: iso(10), status: "Sent" },
        { id: "QT-203", customer: "Sahyadri Supermarket", quantity: 5000, rate: 8.5, total: 42500, valid: iso(3), status: "Accepted" },
        { id: "QT-202", customer: "Pune Bakers", quantity: 1200, rate: 11, total: 13200, valid: iso(-2), status: "Expired" }
      ],
      payments: [
        { id: "P1", orderId: "ORD-2026-00125", customer: "Sahyadri Supermarket", amount: 24000, date: iso(-3), mode: "Bank Transfer" },
        { id: "P2", orderId: "PB-1023", customer: "Green Basket", amount: 36000, date: iso(-2), mode: "UPI" },
        { id: "P3", orderId: "PB-1018", customer: "Sahyadri Supermarket", amount: 20000, date: iso(-4), mode: "Cheque" }
      ],
      expenses: [
        { id: "E1", category: "Raw material", amount: 48000, date: iso(-6) },
        { id: "E2", category: "Transport", amount: 8500, date: iso(-4) },
        { id: "E3", category: "Electricity", amount: 12400, date: iso(-9) },
        { id: "E4", category: "Packing", amount: 6200, date: iso(-3) }
      ]
    };
  }

  let state = loadState();
  let session = loadSession();
  let orderFilter = "All";
  let searchText = "";
  let toastTimer;

  function loadState() {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return stored && stored.version === 3 ? stored : seedState();
    } catch (_) { return seedState(); }
  }
  function saveState() { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); }
  function loadSession() {
    try { return JSON.parse(sessionStorage.getItem(SESSION_KEY)) || null; } catch (_) { return null; }
  }
  function saveSession() { sessionStorage.setItem(SESSION_KEY, JSON.stringify(session)); }
  function t(key) { return I18N[state.settings.language]?.[key] || I18N.en[key] || key; }
  function esc(value) { return String(value ?? "").replace(/[&<>'"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" })[c]); }
  function money(value) { return new Intl.NumberFormat(state.settings.language === "mr" ? "mr-IN" : "en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(Number(value || 0)); }
  function formatDate(value) { return new Intl.DateTimeFormat(state.settings.language === "mr" ? "mr-IN" : "en-IN", { day: "numeric", month: "short", year: "numeric" }).format(new Date(value)); }
  function currentUser() { return state.users.find(u => u.id === session?.userId); }
  function isAdmin() { return currentUser()?.role === "Super Admin"; }
  function initials(name) { return String(name || "PB").split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase(); }
  function routeInfo() {
    const raw = (location.hash || "#dashboard").slice(1);
    const [path, query = ""] = raw.split("?");
    return { path: path || "dashboard", params: new URLSearchParams(query) };
  }
  function go(route) { location.hash = route; }
  function icon(name) {
    const paths = {
      home: '<path d="M3 11 12 3l9 8v9a1 1 0 0 1-1 1h-5v-7H9v7H4a1 1 0 0 1-1-1z"/>',
      orders: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V2h6v2M8 9h8M8 13h8M8 17h5"/>',
      users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
      report: '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
      more: '<circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/>',
      plus: '<path d="M12 5v14M5 12h14"/>', search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
      box: '<path d="m21 8-9 5-9-5 9-5zM3 8v8l9 5 9-5V8M12 13v8"/>',
      money: '<circle cx="12" cy="12" r="9"/><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 6v12"/>',
      alert: '<path d="M10.3 4.2 2.4 18a2 2 0 0 0 1.7 3h15.8a2 2 0 0 0 1.7-3L13.7 4.2a2 2 0 0 0-3.4 0zM12 9v4M12 17h.01"/>',
      check: '<path d="m4 12 5 5L20 6"/>', language: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/>',
      settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06-2.83 2.83-.06-.06A1.7 1.7 0 0 0 15 19.4a1.7 1.7 0 0 0-1 .6 1.7 1.7 0 0 0-.4 1.1V21h-4v-.09A1.7 1.7 0 0 0 8.6 19.4a1.7 1.7 0 0 0-1.88.34l-.06.06-2.83-2.83.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-.6-1 1.7 1.7 0 0 0-1.1-.4H3v-4h.09A1.7 1.7 0 0 0 4.6 8.6a1.7 1.7 0 0 0-.34-1.88l-.06-.06 2.83-2.83.06.06A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-.6 1.7 1.7 0 0 0 .4-1.1V3h4v.09A1.7 1.7 0 0 0 15.4 4.6a1.7 1.7 0 0 0 1.88-.34l.06-.06 2.83 2.83-.06.06A1.7 1.7 0 0 0 19.4 9c.16.36.2.74.2 1.1H21v4h-.09A1.7 1.7 0 0 0 19.4 15z"/>',
      file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M8 13h8M8 17h6"/>',
      truck: '<path d="M10 17h4V5H2v12h3M14 9h4l4 4v4h-3"/><circle cx="7.5" cy="17.5" r="2.5"/><circle cx="16.5" cy="17.5" r="2.5"/>',
      logout: '<path d="M10 17l5-5-5-5M15 12H3M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"/>'
    };
    return `<svg class="icon" aria-hidden="true" viewBox="0 0 24 24">${paths[name] || paths.box}</svg>`;
  }

  function render() {
    document.documentElement.lang = state.settings.language === "mr" ? "mr" : "en";
    if (!session || !currentUser()) return renderLogin();
    const route = routeInfo();
    if (!isAdmin() && !["dashboard", "orders", "order", "more"].includes(route.path)) return go("dashboard");
    const page = renderPage(route.path, route.params);
    document.getElementById("app").innerHTML = appShell(route.path, page);
    bindShellEvents();
    bindPageEvents(route.path);
    renderTour();
  }

  function brand(light) {
    return `<div class="brand"><div class="brand-mark">PB</div><div><div class="brand-name">${t("appName")}</div><div class="brand-sub">${t("appSub")}</div></div></div>`;
  }

  function renderLogin() {
    document.getElementById("app").innerHTML = `
      <main class="login-page">
        <section class="login-story" aria-label="Factory workflow introduction">
          ${brand(true)}
          <h2>One order.<br>Every team.<br>Always clear.</h2>
          <p>From material and design preparation to printing, delivery and payment — everyone sees the right next step.</p>
          <div class="story-flow"><span class="story-step">Order</span><span class="story-step">Material + Design</span><span class="story-step">Production</span><span class="story-step">Billing</span><span class="story-step">Delivery</span></div>
        </section>
        <section class="login-panel">
          <form class="login-card" id="login-form" novalidate>
            ${brand(false)}
            <h1>${t("loginTitle")}</h1><p class="muted">${t("loginText")}</p>
            <div class="login-demo"><strong>${t("demoAccounts")}</strong>
              <div class="demo-login-row"><code>admin@demo.com / admin123</code><button class="tiny-btn" type="button" data-fill="admin@demo.com">Use Admin</button></div>
              <div class="demo-login-row"><code>printing@demo.com / admin123</code><button class="tiny-btn" type="button" data-fill="printing@demo.com">Use Printing</button></div>
            </div>
            <div class="field"><label for="login-username">${t("username")}</label><input id="login-username" name="username" type="email" autocomplete="username" value="admin@demo.com" required></div>
            <div class="field"><label for="login-password">${t("password")}</label><input id="login-password" name="password" type="password" autocomplete="current-password" value="admin123" required><div id="login-error" class="field-error" role="alert"></div></div>
            <button class="btn btn-primary btn-block" type="submit">${t("signIn")}</button>
            <div class="row-between" style="margin-top:16px"><small class="muted">${t("clientDemo")}</small><button class="tiny-btn" type="button" id="login-language">${state.settings.language === "en" ? "मराठी" : "English"}</button></div>
          </form>
        </section>
      </main>`;
    document.querySelectorAll("[data-fill]").forEach(btn => btn.addEventListener("click", () => {
      document.getElementById("login-username").value = btn.dataset.fill;
      document.getElementById("login-password").value = "admin123";
    }));
    document.getElementById("login-language").addEventListener("click", toggleLanguage);
    document.getElementById("login-form").addEventListener("submit", handleLogin);
  }

  function handleLogin(event) {
    event.preventDefault();
    const username = event.currentTarget.username.value.trim().toLowerCase();
    const password = event.currentTarget.password.value;
    const user = state.users.find(u => u.username === username && u.password === password && u.active);
    if (!user) {
      document.getElementById("login-error").textContent = "Use admin@demo.com / admin123 or printing@demo.com / admin123.";
      return;
    }
    session = { userId: user.id };
    saveSession();
    if (user.role === "Super Admin" && state.settings.tourEnabled) state.tourProgress = Math.max(0, state.tourProgress || 0);
    go("dashboard"); render();
  }

  function navItems() {
    if (!isAdmin()) return [
      ["dashboard", "home", t("home")], ["orders", "orders", "My Queue"], ["more", "more", t("more")]
    ];
    return [
      ["dashboard", "home", t("dashboard")], ["orders", "orders", t("orders")], ["customers", "users", t("customers")],
      ["reports", "report", t("reports")], ["quotations", "file", t("quotations")], ["materials", "box", t("materials")],
      ["billing", "money", t("billing")], ["workers", "users", t("workers")], ["settings", "settings", t("settings")], ["more", "more", t("more")]
    ];
  }

  function pageTitle(path) {
    const map = { dashboard: t("dashboard"), orders: t("orders"), order: "Order Details", "new-order": t("newOrder"), customers: t("customers"), reports: t("reports"), quotations: t("quotations"), materials: t("materials"), billing: t("billing"), workers: t("workers"), settings: t("settings"), more: t("more") };
    return map[path] || t("dashboard");
  }

  function appShell(active, page) {
    const user = currentUser();
    const sideNav = navItems().filter(x => x[0] !== "more").map(([route, ico, label]) => `<button class="nav-link ${active === route ? "active" : ""}" data-route="${route}">${icon(ico)}<span>${label}</span></button>`).join("");
    const mobileBase = isAdmin() ? [["dashboard","home",t("home")],["orders","orders",t("orders")],["customers","users",t("customers")],["reports","report",t("reports")],["more","more",t("more")]] : [["dashboard","home",t("home")],["orders","orders","My Queue"],["more","more",t("more")]];
    const mobile = mobileBase.map(([route, ico, label]) => `<button class="${active === route ? "active" : ""}" data-route="${route}">${icon(ico)}<span>${label}</span></button>`).join("");
    return `<div class="app-shell">
      <aside class="sidebar">${brand(true)}<nav class="nav-list" aria-label="Main navigation">${sideNav}</nav>
        <div class="sidebar-foot"><div class="user-mini"><div class="avatar">${initials(user.name)}</div><div><strong>${esc(user.name)}</strong><div style="color:rgba(255,255,255,.55);font-size:.72rem">${esc(user.role)}${user.role === "Worker" ? ` · ${esc(user.assignedStage)}` : ""}</div></div></div></div>
      </aside>
      <div class="main-shell">
        <header class="topbar"><div class="topbar-title"><h1>${pageTitle(active)}</h1><p>${t("trialNotice")}</p></div><div class="top-search"><label class="sr-only" for="global-search">Global search</label>${icon("search")}<input id="global-search" placeholder="Search order, customer or phone" autocomplete="off"></div><span class="sync-pill">● Offline demo</span>
          <button class="icon-btn" id="notifications" aria-label="Notifications" title="Notifications">${icon("alert")}</button>
          <button class="icon-btn" id="language-toggle" aria-label="${t("language")}" title="${t("language")}">${icon("language")}</button>
          <button class="icon-btn" id="top-logout" aria-label="${t("logout")}" title="${t("logout")}">${icon("logout")}</button>
        </header>
        <main class="content" id="main-content" tabindex="-1">${page}</main>
      </div>
      <nav class="mobile-nav" aria-label="Mobile navigation">${mobile}</nav>
    </div>`;
  }

  function bindShellEvents() {
    document.querySelectorAll("[data-route]").forEach(el => el.addEventListener("click", () => go(el.dataset.route)));
    document.getElementById("language-toggle")?.addEventListener("click", toggleLanguage);
    document.getElementById("notifications")?.addEventListener("click", showNotifications);
    document.getElementById("global-search")?.addEventListener("keydown", event => { if (event.key === "Enter") showSearchResults(event.currentTarget.value); });
    document.getElementById("top-logout")?.addEventListener("click", logout);
  }
  function toggleLanguage() { state.settings.language = state.settings.language === "en" ? "mr" : "en"; saveState(); render(); }
  function logout() { session = null; sessionStorage.removeItem(SESSION_KEY); location.hash = ""; render(); }

  function renderPage(path, params) {
    const renderers = {
      dashboard: renderDashboard, orders: () => renderOrders(params), order: () => renderOrderDetail(params.get("id")),
      "new-order": renderNewOrder, customers: renderCustomers, reports: renderReports, quotations: renderQuotations,
      materials: renderMaterials, billing: renderBilling, workers: renderWorkers, settings: renderSettings, more: renderMore
    };
    return (renderers[path] || renderDashboard)();
  }

  function badge(status) { return `<span class="badge badge-${String(status).toLowerCase().replace(/\s+/g,"-")}">${esc(status)}</span>`; }
  function statCard(ico, value, label, trend = "") { return `<article class="card stat-card"><div class="stat-icon">${icon(ico)}</div><div class="stat-number">${value}</div><div class="stat-label">${label}</div>${trend ? `<div class="stat-trend">${trend}</div>` : ""}</article>`; }
  function orderCard(order) {
    const worker = !isAdmin();
    return `<a class="order-card" href="#order?id=${encodeURIComponent(order.id)}">
      <div class="order-top"><div><div class="order-party">${esc(order.customer)}</div><div class="order-id">${esc(order.id)} · ${formatDate(order.created)}</div></div>${badge(order.status)}</div>
      <div class="order-specs"><span>${esc(order.bagType)}</span><span>${esc(order.size)}</span><span>${esc(order.color)}</span><span>${Number(order.quantity).toLocaleString("en-IN")} bags</span></div>
      <div class="order-bottom"><span class="${new Date(order.due) < new Date() && !["Completed","Returned","Refunded"].includes(order.status) ? "due" : "muted"}">${t("dueDate")}: ${formatDate(order.due)}</span>${worker ? `<strong>${esc(order.status)} work</strong>` : `<span class="order-money">${money(order.total - order.paid)} ${t("outstanding")}</span>`}</div>
    </a>`;
  }

  function visibleOrders() {
    if (isAdmin()) return state.orders;
    return state.orders.filter(order => assignedReadySteps(order).length > 0);
  }

  // The two preparation paths work in parallel. Printing is deliberately
  // unavailable until both the cut material and printing plate are ready.
  function isStepReady(order, key) {
    const done = step => Boolean(order.workflow[step]?.done);
    const dependsOn = {
      booked: [], material: ["booked"], design: ["booked"], cutting: ["material"], plate: ["design"],
      printing: ["cutting", "plate"], stitching: ["printing"], packing: ["stitching"], challan: ["packing"],
      billing: ["challan"], payment: ["billing"], dispatch: ["billing"], delivery: ["payment", "dispatch"]
    };
    return !done(key) && (dependsOn[key] || []).every(done);
  }

  function assignedReadySteps(order) {
    const user = currentUser();
    return (user.assignedSteps || []).filter(key => isStepReady(order, key));
  }

  function availableNextStep(order) {
    if (isAdmin()) return nextWorkflow(order);
    return WORKFLOW.find(step => assignedReadySteps(order).includes(step.key));
  }

  function renderDashboard() {
    const orders = visibleOrders();
    if (!isAdmin()) {
      return `<div class="page-head"><div><span class="eyebrow">${esc(currentUser().role)}</span><h2>${t("goodMorning")}, ${esc(currentUser().name.split(" ")[0])}</h2><p>Your queue only shows the actions assigned to your role.</p></div></div>
        <section class="stats-grid">${statCard("orders", orders.length, "Jobs in my queue")}${statCard("alert", orders.filter(o=>o.priority==="Urgent").length, t("urgent"))}${statCard("check", orders.length, "Ready for my action")}${statCard("box", orders.reduce((a,o)=>a+o.quantity,0).toLocaleString("en-IN"), "Total bags")}</section>
        <section class="card" style="margin-top:14px"><div class="card-title"><h3>My ${esc(currentUser().assignedStage)} Queue</h3><a href="#orders">${t("viewAll")}</a></div><div class="order-list">${orders.length ? orders.map(orderCard).join("") : `<div class="empty"><div class="empty-icon">${icon("check")}</div><strong>No action waiting</strong><p>Your work appears automatically when the previous role finishes.</p></div>`}</div></section>`;
    }
    const active = state.orders.filter(o => !["Completed","Returned","Refunded"].includes(o.status));
    const pending = state.orders.reduce((sum,o)=>sum+Math.max(0,o.total-o.paid),0);
    const stageCounts = STAGES.map(stage => ({ stage, count: state.orders.filter(o => o.status === stage).length }));
    return `<div class="page-head"><div><span class="eyebrow">Monday, 24 August 2026</span><h2>${t("goodMorning")}, ${esc(currentUser().name.split(" ")[0])}</h2><p>${t("todayOverview")}</p></div><button class="btn btn-primary" data-route="new-order">${icon("plus")} ${t("newOrder")}</button></div>
      <section class="stats-grid" data-tour="dashboard-stats">
        ${statCard("orders", 2, t("todayOrders"), "+1 from yesterday")}${statCard("box", active.length, t("activeOrders"))}${statCard("alert", 3, t("dueToday"), "1 needs attention")}${statCard("money", money(pending), t("pendingAmount"))}
      </section>
      <section style="margin-top:14px"><div class="card-title"><h3>${t("productionStages")}</h3></div><div class="status-strip">${stageCounts.map(x=>`<button class="status-chip" data-stage-filter="${x.stage}"><strong>${x.count}</strong><span>${x.stage}</span></button>`).join("")}</div></section>
      <div class="split-grid"><section class="card"><div class="card-title"><h3>${t("recentOrders")}</h3><a href="#orders">${t("viewAll")}</a></div><div class="order-list">${state.orders.slice(0,5).map(orderCard).join("")}</div></section>
        <aside class="card"><div class="card-title"><h3>Needs attention</h3></div>
          <div class="order-list"><a class="order-card" href="#order?id=PB-1022"><div class="row-between"><strong>Material shortage</strong>${badge("Shortage")}</div><small class="muted">PB-1022 · 90 GSM red roll required</small></a><a class="order-card" href="#order?id=PB-1021"><div class="row-between"><strong>Payment overdue</strong>${badge("Overdue")}</div><small class="muted">PB-1021 · ${money(7800)} pending</small></a></div>
        </aside></div>`;
  }

  function renderOrders(params) {
    if (params.get("filter") === "Exceptions") orderFilter = "Exceptions";
    let orders = visibleOrders();
    if (searchText) { const q = searchText.toLowerCase(); orders = orders.filter(o => [o.id,o.customer,o.bagType,o.color].some(v => String(v).toLowerCase().includes(q))); }
    if (orderFilter === "Urgent") orders = orders.filter(o => o.priority === "Urgent");
    else if (orderFilter === "Exceptions") orders = orders.filter(o => ["Shortage","Overdue","Returned","Refunded"].includes(o.status));
    else if (orderFilter !== "All") orders = orders.filter(o => o.status === orderFilter);
    const filters = isAdmin() ? ["All","Urgent","New","Cutting","Printing","Stitching","Packing","Dispatched","Completed","Exceptions"] : ["All","Urgent","Printing"];
    return `<div class="page-head"><div><h2>${isAdmin() ? t("orders") : "My Work Queue"}</h2><p>${isAdmin() ? "Track every order from booking to delivery." : `Only ${esc(currentUser().assignedStage)} work is shown.`}</p></div>${isAdmin()?`<button class="btn btn-primary" data-route="new-order">${icon("plus")} ${t("newOrder")}</button>`:""}</div>
      <div class="toolbar"><div class="search-wrap">${icon("search")}<input class="input" id="order-search" value="${esc(searchText)}" placeholder="${t("searchOrders")}" aria-label="${t("searchOrders")}"></div><div class="filter-row">${filters.map(f=>`<button class="filter-chip ${orderFilter===f?"active":""}" data-filter="${f}">${f}</button>`).join("")}</div></div>
      <div class="order-list mobile-order-list">${orders.length ? orders.map(orderCard).join("") : `<div class="card empty"><div class="empty-icon">${icon("search")}</div><strong>${t("noOrders")}</strong><p>Try another search or status.</p></div>`}</div>${isAdmin() && orders.length ? orderTable(orders) : ""}`;
  }

  function orderTable(orders) {
    return `<section class="card desktop-order-table"><div class="card-title"><h3>Order control table</h3><span class="muted">${orders.length} orders</span></div><div class="table-wrap"><table><thead><tr><th>Order #</th><th>Customer / Product</th><th>Qty</th><th>Value</th><th>Current stage</th><th>Priority</th><th>Expected delivery</th><th>Progress</th><th>Owner</th><th>Action</th></tr></thead><tbody>${orders.map(order => { const current = nextWorkflow(order); const complete = WORKFLOW.filter(s => order.workflow[s.key]?.done).length; return `<tr><td><a class="text-link" href="#order?id=${encodeURIComponent(order.id)}">${esc(order.id)}</a></td><td><strong>${esc(order.customer)}</strong><br><span class="muted">${esc(order.bagType)}</span></td><td>${order.quantity.toLocaleString("en-IN")}</td><td>${money(order.total)}</td><td>${badge(order.status)}</td><td>${esc(order.priority)}</td><td>${formatDate(order.due)}</td><td><div class="progress"><span style="width:${Math.round(complete / WORKFLOW.length * 100)}%"></span></div><small>${complete}/${WORKFLOW.length} steps</small></td><td>${esc(current?.owner || "Complete")}</td><td><a class="btn btn-ghost btn-small" href="#order?id=${encodeURIComponent(order.id)}">Open</a></td></tr>`; }).join("")}</tbody></table></div></section>`;
  }

  function nextWorkflow(order) {
    if (order.status === "Shortage" && !order.workflow.material?.done) return WORKFLOW.find(x=>x.key === "material");
    // Admin sees the first available hand-off. Material/design and then
    // cutting/plate are intentionally both eligible at the same time.
    return WORKFLOW.find(step => isStepReady(order, step.key));
  }
  function stepState(order, key) {
    if (order.workflow[key]?.done) return "done";
    if (order.status === "Shortage" && key === "material") return "blocked";
    return isStepReady(order, key) ? "current" : "waiting";
  }
  function flowStep(order, key, n) {
    const step = WORKFLOW.find(x=>x.key===key); const data = order.workflow[key]; const cls = stepState(order,key);
    const label = state.settings.language === "mr" ? step.mr : step.label;
    const progress = order.stageData?.[key];
    const progressText = progress ? `<div class="step-progress">${progress.completed} / ${progress.total} bags</div>` : "";
    return `<button type="button" class="flow-step ${cls}" data-workflow-node="${key}" data-order-node="${order.id}" aria-label="View ${esc(step.label)} details"><div class="step-head"><span class="step-number">${cls==="done"?"✓":cls==="blocked"?"!":n}</span><span class="badge badge-${cls==="done"?"completed":cls==="blocked"?"shortage":"draft"}">${cls==="done"?t("complete"):cls==="current"?t("current"):cls==="blocked"?"Blocked":t("waiting")}</span></div><div class="step-name">${label}</div><div class="step-meta">${data?.done ? `${esc(data.by)} · ${esc(data.at)}` : esc(step.owner)}</div>${progressText}</button>`;
  }
  function workflowMarkup(order) {
    const linear = ["printing","stitching","packing","challan","billing"];
    const final = ["payment","dispatch"];
    return `<div class="workflow"><div>${flowStep(order,"booked",1)}</div><div class="flow-arrow">↓</div><div class="parallel-label">Parallel preparation / समांतर तयारी</div><div class="parallel-grid"><div>${flowStep(order,"material",2)}<div class="flow-arrow">↓</div>${flowStep(order,"cutting",4)}</div><div>${flowStep(order,"design",2)}<div class="flow-arrow">↓</div>${flowStep(order,"plate",4)}</div></div><div class="flow-arrow">↘ &nbsp; ↓ &nbsp; ↙</div>${linear.map((k,i)=>`${flowStep(order,k,i+5)}${i<linear.length-1?'<div class="flow-arrow">↓</div>':''}`).join("")}<div class="flow-arrow">↓</div><div class="parallel-grid">${final.map((k,i)=>flowStep(order,k,i+10)).join("")}</div><div class="flow-arrow">↘ &nbsp; ↓ &nbsp; ↙</div>${flowStep(order,"delivery",13)}</div>`;
  }

  function renderOrderDetail(id) {
    const order = state.orders.find(o=>o.id===id) || state.orders[0];
    if (!isAdmin() && !visibleOrders().some(o=>o.id===order.id)) return `<div class="card empty"><strong>This order is not assigned to your role.</strong><p><a class="text-link" href="#orders">Return to my queue</a></p></div>`;
    const next = availableNextStep(order);
    const isFinal = ["Completed","Returned","Refunded"].includes(order.status);
    const nextLabel = next ? (state.settings.language === "mr" ? next.mr : next.label) : "No production action pending";
    const workflowEvents = WORKFLOW.filter(s=>order.workflow[s.key]?.done).map(s=>({ label: state.settings.language === "mr"?s.mr:s.label, detail: "Stage completed", ...order.workflow[s.key] }));
    const activityEvents = (order.activity || []).map(item => ({ label: item.action, detail: item.detail, at: item.at, by: item.by }));
    const events = [...activityEvents, ...workflowEvents].sort((a,b)=>String(b.at).localeCompare(String(a.at)));
    return `<div class="page-head"><div><a class="text-link" href="#orders">← ${t("orders")}</a></div><div class="actions">${isAdmin()?`<button class="btn btn-secondary btn-small" data-invoice="${order.id}">${icon("file")} View bill</button>`:""}</div></div>
      <section class="card detail-hero"><div class="row-between"><span>${esc(order.id)}</span>${badge(order.status)}</div><h2>${esc(order.customer)}</h2><p class="muted">${esc(order.bagType)} · ${esc(order.size)} · ${Number(order.quantity).toLocaleString("en-IN")} bags</p><div class="detail-summary"><div><small>${t("dueDate")}</small><strong>${formatDate(order.due)}</strong></div><div><small>Priority</small><strong>${esc(order.priority)}</strong></div>${isAdmin()?`<div><small>${t("amount")}</small><strong>${money(order.total)}</strong></div><div><small>${t("outstanding")}</small><strong>${money(order.total-order.paid)}</strong></div>`:`<div><small>Colour</small><strong>${esc(order.color)}</strong></div><div><small>GSM</small><strong>${esc(order.gsm)}</strong></div>`}</div></section>
      ${!isFinal?`<section class="card next-action"><div class="card-title"><div><span class="eyebrow">${t("nextAction")}</span><h3>${nextLabel}</h3></div>${icon(order.status==="Shortage"?"alert":"check")}</div><p class="muted">${order.status==="Shortage"?"Purchase or receive the required material, then release cutting.":next?.key==="printing"?"Both Cutting and Plate are complete. The Printing Operator can now start this job.":next?.key==="stitching"?`${order.stageData?.stitching?.completed || 0} / ${order.stageData?.stitching?.total || order.quantity} bags stitched. Update progress before completion.`:next?"Complete this hand-off to release the next role.":"This role has no pending action on this order."}</p>${next?.key==="stitching"?`<div class="actions"><button class="btn btn-secondary" id="update-stitching" data-order="${order.id}">Update stitching progress</button><button class="btn btn-primary" id="complete-next" data-order="${order.id}">Mark stitching completed</button></div>`:next?`<button class="btn btn-primary" id="complete-next" data-order="${order.id}">${t("completeStep")}</button>`:""}</section>`:""}
      <div class="split-grid"><section class="card"><div class="card-title"><h3>${t("orderJourney")}</h3><span class="muted" style="font-size:.76rem">Click any node for details</span></div>${workflowMarkup(order)}</section><aside><section class="card"><div class="card-title"><h3>Order information</h3></div><div class="order-specs"><span>${esc(order.color)}</span><span>${esc(order.gsm)} GSM</span><span>${esc(order.bagType)}</span></div><p class="muted">${esc(order.notes||"No special instruction.")}</p></section><section class="card"><div class="card-title"><h3>${t("activity")}</h3></div><div class="timeline">${events.slice(0,8).map((e,i)=>`<div class="timeline-item"><div class="timeline-dot">✓</div><div><p><strong>${esc(e.label)}</strong></p><small>${esc(e.by)} · ${esc(e.at)}</small>${e.detail ? `<p class="muted">${esc(e.detail)}</p>` : ""}</div></div>`).join("")}</div></section></aside></div>
      ${isAdmin()?`<section class="card"><div class="card-title"><h3>Order actions</h3></div><div class="workflow-actions"><button class="btn btn-secondary" data-action="payment" data-order="${order.id}">${icon("money")} ${t("addPayment")}</button><button class="btn btn-secondary" data-action="dispatch" data-order="${order.id}">${icon("truck")} ${t("dispatch")}</button><button class="btn btn-success" data-action="delivery" data-order="${order.id}">${icon("check")} ${t("delivery")}</button><button class="btn btn-secondary" data-action="return" data-order="${order.id}">${t("returnOrder")}</button><button class="btn btn-danger" data-action="refund" data-order="${order.id}">${t("refund")}</button></div></section>`:""}`;
  }

  function renderNewOrder() {
    return `<div class="page-head"><div><h2>${t("newOrder")}</h2><p>Only the essential details are required. You can add more later.</p></div></div><form class="card" id="new-order-form" novalidate>
      <section class="form-section"><h3>1. Customer</h3><p>Who placed this order?</p><div class="form-grid"><div class="field"><label for="customer">Customer / Party *</label><select id="customer" name="customer" required><option value="">Select customer</option>${state.customers.map(c=>`<option value="${c.id}">${esc(c.name)}</option>`).join("")}</select><span class="field-error"></span></div><div class="field"><label for="priority">Priority</label><select id="priority" name="priority"><option>Normal</option><option>Urgent</option></select></div></div></section>
      <section class="form-section"><h3>2. Bag specification</h3><p>What exactly should be produced?</p><div class="form-grid"><div class="field"><label for="bag-type">Bag type *</label><select id="bag-type" name="bagType" required><option value="">Select type</option><option>D-Cut Non-Woven</option><option>W-Cut Carry Bag</option><option>Loop Handle Bag</option><option>Box Bag</option></select><span class="field-error"></span></div><div class="field"><label for="size">Size *</label><input id="size" name="size" placeholder="e.g. 14 × 18 in" required><span class="field-error"></span></div><div class="field"><label for="gsm">GSM *</label><input id="gsm" name="gsm" type="number" min="1" placeholder="70" required><span class="field-error"></span></div><div class="field"><label for="color">Base colour *</label><input id="color" name="color" placeholder="Royal Blue" required><span class="field-error"></span></div></div></section>
      <section class="form-section"><h3>3. Quantity and price</h3><p>The total is calculated automatically.</p><div class="form-grid"><div class="field"><label for="quantity">Quantity (bags) *</label><input id="quantity" name="quantity" type="number" min="1" placeholder="5000" required><span class="field-error"></span></div><div class="field"><label for="rate">Rate per bag (₹) *</label><input id="rate" name="rate" type="number" min="0.01" step="0.01" placeholder="8.50" required><span class="field-error"></span></div><div class="field full"><label>Estimated total</label><div class="input" id="total-preview" aria-live="polite">₹0</div></div></div></section>
      <section class="form-section"><h3>4. Production preparation</h3><p>These two activities can start together.</p><div class="form-grid"><label class="check-card"><input type="checkbox" name="materialReady"><span><strong>Material is available</strong><small class="muted">Release the order for cutting.</small></span></label><label class="check-card"><input type="checkbox" name="designReady"><span><strong>Design is approved</strong><small class="muted">Release plate preparation.</small></span></label></div></section>
      <section class="form-section"><h3>5. Delivery</h3><div class="form-grid"><div class="field"><label for="due">Expected delivery date *</label><input id="due" name="due" type="date" required><span class="field-error"></span></div><div class="field"><label for="advance">Advance received (₹)</label><input id="advance" name="advance" type="number" min="0" value="0"></div><div class="field full"><label for="notes">Special instructions</label><textarea id="notes" name="notes" placeholder="Printing, packing or delivery instructions"></textarea></div></div></section>
      <div class="actions"><button type="button" class="btn btn-secondary" data-route="orders">${t("cancel")}</button><button type="submit" class="btn btn-primary">${t("save")} ${t("newOrder")}</button></div></form>`;
  }

  function renderCustomers() {
    return `<div class="page-head"><div><h2>${t("customers")}</h2><p>Contact details, orders and balances in one place.</p></div><button class="btn btn-primary">${icon("plus")} Add customer</button></div><div class="grid">${state.customers.map(c=>{
      const count=state.orders.filter(o=>o.customerId===c.id).length; return `<article class="card"><div class="row-between"><div><strong>${esc(c.name)}</strong><div class="muted">${esc(c.company)} · ${esc(c.city)}</div></div>${c.outstanding?badge("Overdue"):badge("Paid")}</div><div class="detail-summary" style="margin-top:14px"><div style="background:var(--bg)"><small>Mobile</small><strong>${esc(c.mobile)}</strong></div><div style="background:var(--bg)"><small>Orders</small><strong>${count}</strong></div><div style="background:var(--bg)"><small>${t("outstanding")}</small><strong>${money(c.outstanding)}</strong></div><div style="background:var(--bg)"><button class="btn btn-ghost btn-small" data-statement="${c.id}">${t("statement")}</button></div></div></article>`;}).join("")}</div>`;
  }

  function renderReports() {
    const revenue=state.orders.reduce((a,o)=>a+o.paid,0), expenses=state.expenses.reduce((a,e)=>a+e.amount,0), completed=state.orders.filter(o=>o.status==="Completed").reduce((a,o)=>a+o.quantity,0);
    const bars=["New","Cutting","Printing","Stitching","Packing","Dispatched","Completed"].map(s=>({s,n:state.orders.filter(o=>o.status===s).length})); const max=Math.max(1,...bars.map(x=>x.n));
    return `<div class="page-head"><div><h2>${t("reports")}</h2><p>Simple numbers for better daily decisions.</p></div><span class="badge badge-completed">August 2026</span></div><section class="stats-grid">${statCard("money",money(revenue),t("monthlyRevenue"),"+12% vs July")}${statCard("alert",money(expenses),t("expenses"))}${statCard("report",money(revenue-expenses),t("profit"))}${statCard("box",completed.toLocaleString("en-IN"),`${t("production")} (bags)`)}</section><div class="split-grid" style="margin-top:14px"><section class="card"><div class="card-title"><h3>Orders by stage</h3></div><div class="bar-chart">${bars.map(x=>`<div class="bar-row"><span>${x.s}</span><div class="bar-track"><div class="bar-fill" style="width:${Math.max(5,x.n/max*100)}%"></div></div><strong>${x.n}</strong></div>`).join("")}</div></section><section class="card"><div class="card-title"><h3>Outstanding parties</h3></div>${state.customers.filter(c=>c.outstanding).map(c=>`<div class="row-between" style="padding:10px 0;border-bottom:1px solid var(--border)"><span>${esc(c.name)}</span><strong class="money-negative">${money(c.outstanding)}</strong></div>`).join("")}</section></div><section class="card"><div class="card-title"><h3>Expenses</h3><button class="btn btn-primary btn-small">${icon("plus")} Add expense</button></div><div class="table-wrap"><table><thead><tr><th>Date</th><th>Category</th><th>Amount</th></tr></thead><tbody>${state.expenses.map(e=>`<tr><td>${formatDate(e.date)}</td><td>${esc(e.category)}</td><td>${money(e.amount)}</td></tr>`).join("")}</tbody></table></div></section>`;
  }

  function renderQuotations() {
    return `<div class="page-head"><div><h2>${t("quotations")}</h2><p>Share an estimate first; convert it to an order after approval.</p></div><button class="btn btn-primary" id="new-quote">${icon("plus")} ${t("createQuotation")}</button></div><div class="grid">${state.quotations.map(q=>`<article class="card"><div class="row-between"><div><strong>${esc(q.customer)}</strong><div class="muted">${esc(q.id)} · Valid until ${formatDate(q.valid)}</div></div>${badge(q.status)}</div><div class="detail-summary"><div style="background:var(--bg)"><small>${t("quantity")}</small><strong>${q.quantity.toLocaleString("en-IN")}</strong></div><div style="background:var(--bg)"><small>Rate</small><strong>${money(q.rate)}</strong></div><div style="background:var(--bg)"><small>Total</small><strong>${money(q.total)}</strong></div><div style="background:var(--bg)"><button class="btn btn-ghost btn-small">View quotation</button></div></div></article>`).join("")}</div>`;
  }

  function renderMaterials() {
    const low=state.materials.filter(m=>m.stock<=m.reorder);
    return `<div class="page-head"><div><h2>${t("materials")}</h2><p>Know what is available before cutting starts.</p></div><button class="btn btn-primary">${icon("plus")} Record purchase</button></div>${low.length?`<section class="card next-action"><div class="card-title"><div><span class="eyebrow">${t("lowStock")}</span><h3>${low.length} items need attention</h3></div>${icon("alert")}</div><p class="muted">Purchase these materials to avoid production delays.</p></section>`:""}<div class="grid">${state.materials.map(m=>{const low=m.stock<=m.reorder;const pct=Math.min(100,m.stock/(m.reorder*2)*100);return `<article class="card"><div class="row-between"><div><strong>${esc(m.name)}</strong><div class="muted">${t("reorder")}: ${m.reorder} ${esc(m.unit)}</div></div>${low?badge("Low stock"):badge("Available")}</div><div class="row-between" style="margin:15px 0 7px"><span>${t("available")}</span><strong>${m.stock} ${esc(m.unit)}</strong></div><div class="progress"><span style="width:${pct}%;background:${low?'var(--danger)':'var(--green)'}"></span></div></article>`;}).join("")}</div>`;
  }

  function renderBilling() {
    const total=state.orders.reduce((a,o)=>a+o.total,0), received=state.orders.reduce((a,o)=>a+o.paid,0), pending=total-received;
    return `<div class="page-head"><div><h2>${t("billing")}</h2><p>Invoices, collections and balances together.</p></div><button class="btn btn-primary">${icon("money")} Record payment</button></div><section class="stats-grid">${statCard("file",money(total),"Total billed")}${statCard("money",money(received),"Received")}${statCard("alert",money(pending),t("outstanding"))}${statCard("check",state.orders.filter(o=>o.paid>=o.total).length,"Fully paid orders")}</section><section class="card" style="margin-top:14px"><div class="card-title"><h3>Order balances</h3></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Customer</th><th>Bill</th><th>Received</th><th>Balance</th><th>Status</th></tr></thead><tbody>${state.orders.map(o=>`<tr><td><a class="text-link" href="#order?id=${o.id}">${o.id}</a></td><td>${esc(o.customer)}</td><td>${money(o.total)}</td><td>${money(o.paid)}</td><td>${money(o.total-o.paid)}</td><td>${o.paid>=o.total?badge("Paid"):badge(o.due<new Date().toISOString().slice(0,10)?"Overdue":"Pending")}</td></tr>`).join("")}</tbody></table></div></section><section class="card"><div class="card-title"><h3>Recent payments</h3></div>${state.payments.map(p=>`<div class="row-between" style="padding:11px 0;border-bottom:1px solid var(--border)"><div><strong>${esc(p.customer)}</strong><div class="muted">${p.orderId} · ${p.mode}</div></div><div style="text-align:right"><strong class="money-positive">+${money(p.amount)}</strong><div class="muted">${formatDate(p.date)}</div></div></div>`).join("")}</section>`;
  }

  function renderWorkers() {
    const operational = state.users.filter(u => u.role !== "Super Admin");
    return `<div class="page-head"><div><h2>${t("workers")}</h2><p>One Admin plus ${operational.length} operational users: every hand-off has a named owner.</p></div><button class="btn btn-primary">${icon("plus")} Add user</button></div>
      <section class="card next-action"><div class="card-title"><div><span class="eyebrow">Recommended team setup</span><h3>11 user accounts: 1 Admin + 10 role-based users</h3></div>${icon("users")}</div><p class="muted">Do not give every person the full app. Each role sees only its ready work; Admin alone sees the complete order journey, money and reports.</p></section>
      <section class="card"><div class="card-title"><h3>Role hand-off map</h3><span class="muted" style="font-size:.78rem">Parallel steps are marked together</span></div><div class="role-map"><span>Marketing</span><b>→</b><span>Material + Design</span><b>→</b><span>Cutting + Plate</span><b>→</b><span>Printing</span><b>→</b><span>Stitching</span><b>→</b><span>Packing</span><b>→</b><span>D.C.</span><b>→</b><span>Accountant</span><b>→</b><span>Dispatch</span><b>→</b><span>Delivery</span></div></section>
      <div class="grid">${state.users.map(u=>`<article class="card"><div class="row-between"><div style="display:flex;align-items:center;gap:11px"><div class="avatar">${initials(u.name)}</div><div><strong>${esc(u.name)}</strong><div class="muted">${esc(u.username)} · Demo password: admin123</div></div></div>${badge(u.active?"Active":"Disabled")}</div><div class="detail-summary"><div style="background:var(--bg)"><small>${t("role")}</small><strong>${esc(u.role)}</strong></div><div style="background:var(--bg)"><small>${t("assignedStage")}</small><strong>${esc(u.assignedStage)}</strong></div></div><div class="role-permission"><strong>Can complete:</strong> ${u.role === "Super Admin" ? "Every step and all reports" : (u.assignedSteps || []).map(key => esc(WORKFLOW.find(s=>s.key===key)?.label)).join(" · ")}</div></article>`).join("")}</div>`;
  }

  function renderSettings() {
    return `<div class="page-head"><div><h2>${t("settings")}</h2><p>Keep the experience familiar for your team.</p></div></div><section class="card"><div class="card-title"><h3>${t("language")}</h3></div><div class="segmented"><button data-lang="en" class="${state.settings.language==="en"?"active":""}">${t("english")}</button><button data-lang="mr" class="${state.settings.language==="mr"?"active":""}">${t("marathi")}</button></div></section><section class="card"><div class="card-title"><h3>Demo controls</h3></div><p class="muted">Restart the client presentation or restore all fictional records.</p><div class="actions"><button class="btn btn-secondary" id="restart-tour">${t("restartTour")}</button><button class="btn btn-danger" id="reset-demo">${t("reset")}</button></div></section><section class="card"><div class="card-title"><h3>Production stages</h3></div><div class="filter-row">${STAGES.map((s,i)=>`<span class="filter-chip active">${i+1}. ${s}</span>`).join("")}</div></section>`;
  }

  function renderMore() {
    const adminCards = [
      ["quotations","file",t("quotations"),"Price estimates and approvals"],["materials","box",t("materials"),"Stock and shortage alerts"],["billing","money",t("billing"),"Bills, payments and balances"],["workers","users",t("workers"),"Roles and stage assignments"],["settings","settings",t("settings"),"Language and demo controls"]
    ];
    const workerCards = [["orders","orders","My Printing Queue","Only work assigned to this operator"]];
    const cards=(isAdmin()?adminCards:workerCards).map(([route,ico,title,desc])=>`<a class="card menu-card" href="#${route}"><span class="menu-icon">${icon(ico)}</span><span><strong>${title}</strong><span>${desc}</span></span></a>`).join("");
    return `<div class="page-head"><div><h2>${t("more")}</h2><p>${isAdmin()?"Business tools and demo controls.":"Your account and focused work tools."}</p></div></div><div class="menu-grid">${cards}<button class="card menu-card" id="role-switch"><span class="menu-icon">${icon("users")}</span><span style="text-align:left"><strong>${t("switchRole")}</strong><span>Preview any of the 11 factory user accounts</span></span></button><button class="card menu-card" id="more-tour"><span class="menu-icon">${icon("report")}</span><span style="text-align:left"><strong>${t("restartTour")}</strong><span>Show the client story step by step</span></span></button><button class="card menu-card" id="more-logout"><span class="menu-icon">${icon("logout")}</span><span style="text-align:left"><strong>${t("logout")}</strong><span>Return to the demo login</span></span></button></div><section class="card" style="margin-top:14px;text-align:center"><strong>Prabodhan Bag Client Demo</strong><p class="muted">Version 1.1 · Fully offline · Fictional sample records</p></section>`;
  }

  function bindPageEvents(path) {
    document.querySelectorAll("[data-stage-filter]").forEach(el=>el.addEventListener("click",()=>{orderFilter=el.dataset.stageFilter;go("orders");}));
    if (path === "orders") {
      document.querySelectorAll("[data-filter]").forEach(el=>el.addEventListener("click",()=>{orderFilter=el.dataset.filter;render();}));
      document.getElementById("order-search")?.addEventListener("input",e=>{searchText=e.target.value;render();requestAnimationFrame(()=>{const x=document.getElementById("order-search");x?.focus();x?.setSelectionRange(searchText.length,searchText.length);});});
    }
    if (path === "new-order") bindNewOrder();
    if (path === "order") {
      document.getElementById("complete-next")?.addEventListener("click", e=>confirmComplete(e.currentTarget.dataset.order));
      document.getElementById("update-stitching")?.addEventListener("click", e=>updateStitchingProgress(e.currentTarget.dataset.order));
      document.querySelectorAll("[data-action]").forEach(el=>el.addEventListener("click",()=>handleOrderAction(el.dataset.action,el.dataset.order)));
      document.querySelectorAll("[data-invoice]").forEach(el=>el.addEventListener("click",()=>showInvoice(el.dataset.invoice)));
      document.querySelectorAll("[data-workflow-node]").forEach(el=>el.addEventListener("click",()=>showWorkflowNode(el.dataset.orderNode,el.dataset.workflowNode)));
    }
    document.querySelectorAll("[data-statement]").forEach(el=>el.addEventListener("click",()=>showStatement(el.dataset.statement)));
    document.querySelectorAll("[data-lang]").forEach(el=>el.addEventListener("click",()=>{state.settings.language=el.dataset.lang;saveState();render();}));
    document.getElementById("restart-tour")?.addEventListener("click", restartTour);
    document.getElementById("reset-demo")?.addEventListener("click", confirmReset);
    document.getElementById("more-tour")?.addEventListener("click", restartTour);
    document.getElementById("more-logout")?.addEventListener("click", logout);
    document.getElementById("role-switch")?.addEventListener("click", switchRole);
    document.getElementById("new-quote")?.addEventListener("click",()=>showToast("Quotation form is represented as a presentation action.","success"));
  }

  function bindNewOrder() {
    const form=document.getElementById("new-order-form"); const update=()=>{const q=Number(form.quantity.value)||0,r=Number(form.rate.value)||0;document.getElementById("total-preview").textContent=money(q*r);};
    form.quantity.addEventListener("input",update); form.rate.addEventListener("input",update); form.addEventListener("submit",submitOrder);
  }
  function submitOrder(e) {
    e.preventDefault(); const form=e.currentTarget; let valid=true;
    form.querySelectorAll("[required]").forEach(input=>{const err=input.closest(".field")?.querySelector(".field-error");const bad=!input.value||Number.isNaN(input.type==="number"?Number(input.value):0)||(input.type==="number"&&Number(input.value)<=0);if(err)err.textContent=bad?"Please enter a valid value.":"";if(bad)valid=false;});
    if(!valid){showToast("Please check the highlighted fields.","error");return;}
    const fd=new FormData(form), customer=state.customers.find(c=>c.id===fd.get("customer")); const nextNum=Math.max(...state.orders.map(o=>Number(o.id.split("-")[1])))+1; const total=Number(fd.get("quantity"))*Number(fd.get("rate"));
    const workflow={booked:{done:true,at:"2026-08-24 15:30",by:currentUser().name}}; if(fd.get("materialReady"))workflow.material={done:true,at:"2026-08-24 15:31",by:"Store"}; if(fd.get("designReady"))workflow.design={done:true,at:"2026-08-24 15:31",by:"Designer"};
    state.orders.unshift({id:`PB-${nextNum}`,customerId:customer.id,customer:customer.name,bagType:fd.get("bagType"),size:fd.get("size"),gsm:fd.get("gsm"),color:fd.get("color"),quantity:Number(fd.get("quantity")),rate:Number(fd.get("rate")),total,paid:Number(fd.get("advance"))||0,due:fd.get("due"),priority:fd.get("priority"),status:fd.get("materialReady")?"Cutting":"New",created:new Date().toISOString().slice(0,10),workflow,notes:fd.get("notes")});
    saveState(); showToast(t("orderSaved"),"success"); go(`order?id=PB-${nextNum}`);
  }

  function confirmComplete(id) {
    const order=state.orders.find(o=>o.id===id), next=availableNextStep(order); if(!next)return;
    showDialog("Complete this step?", `${next.label} will be marked complete for ${order.id}.`, ()=>{
      order.workflow[next.key]={done:true,at:"2026-08-24 15:45",by:currentUser().name};
      addActivity(order, currentUser().name, `Completed ${next.label}`, `${next.label} released the next department.`);
      updateOrderStatus(order,next.key); saveState(); closeDialog(); showToast(`${next.label} completed.`,"success"); render();
    });
  }
  function addActivity(order, by, action, detail) {
    order.activity = order.activity || [];
    order.activity.unshift({ at: "2026-08-24 15:45", by, action, detail });
  }
  function updateStitchingProgress(id) {
    const order = state.orders.find(o => o.id === id);
    const stage = order.stageData?.stitching || { completed: 0, total: order.quantity };
    showDialog("Update stitching progress", `<div class="field"><label for="stitching-completed">Completed bags</label><input id="stitching-completed" type="number" min="${stage.completed}" max="${stage.total}" value="${stage.completed}"></div><p class="muted">Current target: ${stage.total} bags. Example: 320 → 400.</p>`, () => {
      const completed = Number(document.getElementById("stitching-completed").value);
      if (!Number.isFinite(completed) || completed < stage.completed || completed > stage.total) { showToast("Enter a valid completed quantity.", "error"); return; }
      order.stageData = order.stageData || {}; order.stageData.stitching = { ...stage, completed };
      addActivity(order, currentUser().name, "Updated stitching progress", `${completed} / ${stage.total} bags completed`);
      saveState(); closeDialog(); showToast("Stitching progress updated.", "success"); render();
    }, true, "Save progress");
  }
  function showWorkflowNode(orderId, key) {
    const order = state.orders.find(o => o.id === orderId), step = WORKFLOW.find(s => s.key === key), data = order.workflow[key], progress = order.stageData?.[key];
    const stateLabel = data?.done ? "Completed" : stepState(order, key) === "current" ? "Ready / In progress" : stepState(order, key) === "blocked" ? "Blocked" : "Waiting for dependency";
    const details = progress ? `<div class="row-between"><span>Progress</span><strong>${progress.completed} / ${progress.total} bags</strong></div>` : "";
    const issue = key === "material" && order.status === "Shortage" ? `<div class="card" style="margin-top:12px;background:var(--soft-red)"><strong>Material shortage</strong><p class="muted">Required: 60 kg · Available: 42 kg. Purchase requirement is pending.</p></div>` : "";
    showDialog(`${step.label} · ${order.id}`, `<div class="row-between"><span>Status</span>${badge(stateLabel)}</div><div class="row-between" style="margin-top:10px"><span>Responsible</span><strong>${esc(step.owner)}</strong></div><div class="row-between" style="margin-top:10px"><span>Timestamp</span><strong>${data?.done ? esc(data.at) : "Not completed"}</strong></div>${details}${issue}<p class="muted">This node is part of the same order lifecycle; updates are reflected in every queue.</p>`, closeDialog, true, "Close");
  }
  function updateOrderStatus(order,key) {
    const wasShortage = order.status === "Shortage";
    const map={material:order.status === "Shortage" ? "New" : order.status,design:order.status,plate:order.workflow.cutting?.done?"Printing":order.status,cutting:order.workflow.plate?.done?"Printing":"Cutting",printing:"Stitching",stitching:"Packing",packing:"Packing",challan:"D.C. Ready",billing:"Billing",payment:order.status,dispatch:"Dispatched",delivery:"Completed"};
    order.status=map[key]||order.status; if(key==="material" && wasShortage)order.status="Cutting";
  }
  function handleOrderAction(action,id) {
    const order=state.orders.find(o=>o.id===id); if(!order)return;
    if(action==="payment") return paymentDialog(order);
    const labels={dispatch:["Mark order dispatched?","Dispatch","dispatch","Dispatched"],delivery:["Confirm customer delivery?","Delivery confirmation","delivery","Completed"],return:["Record this order as returned?","Return","return","Returned"],refund:["Issue a demo refund?","Refund","refund","Refunded"]}; const x=labels[action];
    showDialog(x[0],`This updates ${order.id} to ${x[3]}.`,()=>{if(x[2]==="return"||x[2]==="refund")order.returnReason=action==="return"?"Return recorded during client demo.":"Refund recorded during client demo.";else order.workflow[x[2]]={done:true,at:"2026-08-24 16:00",by:currentUser().name};order.status=x[3];saveState();closeDialog();showToast(`${x[1]} recorded.`,"success");render();});
  }
  function paymentDialog(order) {
    const outstanding=Math.max(0,order.total-order.paid); showDialog("Record payment",`<div class="field"><label for="payment-amount">Amount received</label><input id="payment-amount" type="number" min="1" max="${outstanding}" value="${outstanding}"></div>`,()=>{const amount=Number(document.getElementById("payment-amount").value);if(!amount||amount<1||amount>outstanding){showToast("Enter a valid payment amount.","error");return;}order.paid+=amount;state.payments.unshift({id:`P${Date.now()}`,orderId:order.id,customer:order.customer,amount,date:new Date().toISOString().slice(0,10),mode:"Demo payment"});if(order.paid>=order.total)order.workflow.payment={done:true,at:"2026-08-24 16:05",by:currentUser().name};saveState();closeDialog();showToast("Payment recorded.","success");render();},true);
  }

  function showInvoice(id) {
    const o=state.orders.find(x=>x.id===id); showDialog(`Invoice · ${o.id}`,`<div class="row-between"><span>Customer</span><strong>${esc(o.customer)}</strong></div><div class="row-between" style="margin-top:10px"><span>${Number(o.quantity).toLocaleString("en-IN")} bags × ${money(o.rate)}</span><strong>${money(o.total)}</strong></div><hr style="border:0;border-top:1px solid var(--border);margin:16px 0"><div class="row-between"><strong>Balance due</strong><strong class="${o.total-o.paid?"money-negative":"money-positive"}">${money(o.total-o.paid)}</strong></div><p class="muted">Demo preview only. No PDF is generated.</p>`,closeDialog,true,"Close");
  }
  function getNotifications() {
    const notifications = [];
    state.orders.filter(order => order.status === "Shortage").forEach(order => notifications.push({ order, text: `Material shortage for ${order.id}`, type: "Blocked" }));
    state.orders.filter(order => !order.workflow.design?.done).forEach(order => notifications.push({ order, text: `Design approval pending for ${order.id}`, type: "Waiting" }));
    state.orders.filter(order => order.status === "Overdue").forEach(order => notifications.push({ order, text: `Payment overdue for ${order.id}`, type: "Issue" }));
    state.orders.filter(order => order.workflow.billing?.done && !order.workflow.payment?.done).forEach(order => notifications.push({ order, text: `Payment pending for ${order.id}`, type: "Waiting" }));
    return notifications.slice(0, 6);
  }
  function showNotifications() {
    const notes = getNotifications();
    showDialog("Notifications", notes.length ? `<div class="order-list">${notes.map(note => `<button class="order-card" data-note-order="${note.order.id}"><div class="row-between"><strong>${esc(note.text)}</strong>${badge(note.type)}</div><small class="muted">${esc(note.order.customer)} · ${esc(note.order.status)}</small></button>`).join("")}</div>` : `<p class="muted">No new notifications.</p>`, closeDialog, true, "Close");
    document.querySelectorAll("[data-note-order]").forEach(button => button.addEventListener("click", () => { closeDialog(); go(`order?id=${button.dataset.noteOrder}`); }));
  }
  function showSearchResults(query) {
    const q = String(query || "").trim().toLowerCase();
    if (!q) return showToast("Enter an order number, customer, product or phone.", "error");
    const found = (isAdmin() ? state.orders : visibleOrders()).filter(order => {
      const customer = state.customers.find(c => c.id === order.customerId);
      return [order.id, order.customer, order.bagType, customer?.mobile].some(value => String(value || "").toLowerCase().includes(q));
    });
    showDialog("Search results", found.length ? `<div class="order-list">${found.map(order => orderCard(order)).join("")}</div>` : `<p class="muted">No matching order or customer was found.</p>`, closeDialog, true, "Close");
  }
  function showStatement(id) {
    const c=state.customers.find(x=>x.id===id), orders=state.orders.filter(o=>o.customerId===id); showDialog(`${t("statement")} · ${c.name}`,`<div class="row-between"><span>Total orders</span><strong>${orders.length}</strong></div><div class="row-between" style="margin-top:10px"><span>${t("outstanding")}</span><strong class="money-negative">${money(c.outstanding)}</strong></div><div style="margin-top:14px">${orders.map(o=>`<div class="row-between" style="padding:8px 0;border-top:1px solid var(--border)"><span>${o.id}</span><strong>${money(o.total)}</strong></div>`).join("")}</div>`,closeDialog,true,"Close");
  }
  function switchRole() {
    const options = state.users.map(user => `<option value="${user.id}" ${user.id === currentUser().id ? "selected" : ""}>${esc(user.role)} — ${esc(user.name)}</option>`).join("");
    showDialog("Switch demo role", `<div class="field"><label for="role-user">Choose the user account to preview</label><select id="role-user">${options}</select></div><p class="muted">Each role can only see and complete its own ready work.</p>`, () => {
      const target = state.users.find(user => user.id === document.getElementById("role-user").value);
      setDemoUser(target); closeDialog();
    }, true, "Switch role");
  }
  function setDemoUser(target) { if (!target) return; session={userId:target.id};saveSession();state.settings.tourEnabled=false;saveState();go("dashboard");render();showToast(`Switched to ${target.role} view.`,"success"); }
  function confirmReset(){showDialog("Reset all demo data?","This removes local changes and restores the original fictional records.",()=>{const lang=state.settings.language;state=seedState();state.settings.language=lang;saveState();closeDialog();showToast("Demo data restored.","success");go("dashboard");render();});}

  function showDialog(title,body,onConfirm,html=false,confirmLabel="Confirm") {
    const root=document.getElementById("dialog-root"); root.innerHTML=`<div class="dialog-backdrop" id="dialog-backdrop"><section class="dialog" role="dialog" aria-modal="true" aria-labelledby="dialog-title"><h2 id="dialog-title">${esc(title)}</h2>${html?body:`<p>${esc(body)}</p>`}<div class="dialog-actions"><button class="btn btn-secondary" id="dialog-cancel">${t("cancel")}</button><button class="btn btn-primary" id="dialog-confirm">${esc(confirmLabel)}</button></div></section></div>`;
    document.getElementById("dialog-cancel").addEventListener("click",closeDialog); document.getElementById("dialog-confirm").addEventListener("click",onConfirm); root.querySelector(".dialog").focus(); document.addEventListener("keydown",dialogKey);
  }
  function dialogKey(e){if(e.key==="Escape")closeDialog();}
  function closeDialog(){document.getElementById("dialog-root").innerHTML="";document.removeEventListener("keydown",dialogKey);}
  function showToast(message,type=""){const root=document.getElementById("toast-root");root.innerHTML=`<div class="toast ${type}" role="status">${esc(message)}</div>`;clearTimeout(toastTimer);toastTimer=setTimeout(()=>root.innerHTML="",2800);}

  function restartTour(){if(!isAdmin()) { const admin = state.users.find(user => user.role === "Super Admin"); session = { userId: admin.id }; saveSession(); } state.settings.tourEnabled=true;state.tourProgress=0;saveState();go(TOUR[0].route);render();}
  function renderTour(){
    document.querySelectorAll(".tour-highlight").forEach(el=>el.classList.remove("tour-highlight")); if(!isAdmin()||!state.settings.tourEnabled)return;
    const i=Math.min(state.tourProgress,TOUR.length-1),step=TOUR[i],root=document.getElementById("dialog-root"); const mr=state.settings.language==="mr";
    root.innerHTML=`<aside class="tour-card" aria-label="Guided tour"><div class="tour-count">STEP ${i+1} OF ${TOUR.length}</div><h3>${esc(mr?step.mr:step.title)}</h3><p>${esc(mr?step.mrText:step.text)}</p><div class="tour-actions"><button class="btn btn-secondary btn-small" id="tour-skip">${t("tourSkip")}</button><div class="actions">${i?`<button class="btn btn-secondary btn-small" id="tour-back">${t("tourBack")}</button>`:""}<button class="btn btn-primary btn-small" id="tour-next">${i===TOUR.length-1?t("tourFinish"):t("tourNext")}</button></div></div></aside>`;
    document.getElementById("tour-skip").addEventListener("click",finishTour); document.getElementById("tour-back")?.addEventListener("click",()=>moveTour(-1)); document.getElementById("tour-next").addEventListener("click",()=>i===TOUR.length-1?finishTour():moveTour(1));
    requestAnimationFrame(()=>document.querySelector(step.selector)?.classList.add("tour-highlight"));
  }
  function moveTour(delta){state.tourProgress=Math.max(0,Math.min(TOUR.length-1,state.tourProgress+delta));saveState();go(TOUR[state.tourProgress].route);render();}
  function finishTour(){state.settings.tourEnabled=false;state.tourProgress=0;saveState();document.getElementById("dialog-root").innerHTML="";document.querySelectorAll(".tour-highlight").forEach(el=>el.classList.remove("tour-highlight"));showToast("Guided tour completed.","success");}

  window.addEventListener("hashchange",render);
  window.addEventListener("DOMContentLoaded",()=>{if(!location.hash&&session)location.hash="dashboard";render();});
})();
