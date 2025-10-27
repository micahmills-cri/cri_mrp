// Backup of current database data before schema update
export const backupData = {
  departments: [
    { id: "cmfwr6qy20000mv56yi2ho6g5", name: "Lamination" },
    { id: "cmfwr6r0l0001mv56tlj11fu5", name: "Shipping" },
    { id: "cmfwr6r1q0002mv56bur5x5hl", name: "QA" },
    { id: "cmfwr6r570003mv56otaw9zhy", name: "Kitting" },
    { id: "cmfwr6r570004mv56mouqlg1d", name: "Final Rigging" },
    { id: "cmfwr6r5k0005mv56leylwu4o", name: "Capping" },
    { id: "cmfwr6r5r0007mv56rezc2jv9", name: "Water Test" },
    { id: "cmfwr6r5r0006mv56jsa5wy6q", name: "Engine Hang" },
    { id: "cmfwr6r5y0008mv56um3jo3ez", name: "Deck Rigging" },
    { id: "cmfwr6r660009mv56j89zqwqk", name: "Hull Rigging" },
    { id: "cmfwr6r6j000amv56md5pbmfe", name: "Cleaning" }
  ],
  users: [
    {
      id: "cmfwr6s9e001jmv5659vvhrqm",
      email: "admin@cri.local",
      passwordHash: "$2b$12$4cvQAnsDxPW8eZ.DLoF.he/tKys3jzCjz4rIwhEznEFA/YdH2mxLa",
      role: "ADMIN",
      departmentId: null,
      hourlyRate: 45.00,
      shiftSchedule: { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "08:00", "endTime": "17:00" }
    },
    {
      id: "cmfwr6s9e001kmv5660mr74fo",
      email: "supervisor@cri.local",
      passwordHash: "$2b$12$Om0qEF9ScNotcaDnoqY4h.FTfxf5TkPOiM.nMPEFKOYLosf.Q0V2e",
      role: "SUPERVISOR",
      departmentId: "cmfwr6r660009mv56j89zqwqk",
      hourlyRate: 35.00,
      shiftSchedule: { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "07:00", "endTime": "16:00" }
    },
    {
      id: "cmfwr6s9e001lmv567pcikcpy",
      email: "operator@cri.local",
      passwordHash: "$2b$12$NL98avVAWBajkgLuavY2AOnHplC.ws6tUaYaU/noj09coe5fbOOR6",
      role: "OPERATOR",
      departmentId: "cmfwr6r660009mv56j89zqwqk",
      hourlyRate: 22.50,
      shiftSchedule: { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "08:00", "endTime": "17:00" }
    },
    {
      id: "cmfwr6s9e001mmv56newuser01",
      email: "joe.smith@cri.local",
      passwordHash: "$2b$12$NL98avVAWBajkgLuavY2AOnHplC.ws6tUaYaU/noj09coe5fbOOR6",
      role: "OPERATOR",
      departmentId: "cmfwr6qy20000mv56yi2ho6g5",
      hourlyRate: 20.00,
      shiftSchedule: { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "08:00", "endTime": "17:00" }
    },
    {
      id: "cmfwr6s9e001nmv56newuser02",
      email: "dave.jones@cri.local",
      passwordHash: "$2b$12$NL98avVAWBajkgLuavY2AOnHplC.ws6tUaYaU/noj09coe5fbOOR6",
      role: "OPERATOR",
      departmentId: "cmfwr6r5y0008mv56um3jo3ez",
      hourlyRate: 25.00,
      shiftSchedule: { "days": ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"], "startTime": "06:00", "endTime": "15:00" }
    }
  ],
  workCenters: [
    { id: "cmfwr6r95000rmv56pz1n5v4x", name: "Hull Rigging", departmentId: "cmfwr6r660009mv56j89zqwqk", isActive: true },
    { id: "cmfwr6r95000smv562kq5d6ur", name: "Shipping", departmentId: "cmfwr6r0l0001mv56tlj11fu5", isActive: true },
    { id: "cmfwr6r95000omv56qcz8jid7", name: "QA", departmentId: "cmfwr6r1q0002mv56bur5x5hl", isActive: true },
    { id: "cmfwr6r94000kmv56iidjxbj4", name: "Engine Hang", departmentId: "cmfwr6r5r0006mv56jsa5wy6q", isActive: true },
    { id: "cmfwr6r94000emv56qvlppsw9", name: "Kitting", departmentId: "cmfwr6r570003mv56otaw9zhy", isActive: true },
    { id: "cmfwr6r94000cmv56sa1ryiql", name: "Lamination", departmentId: "cmfwr6qy20000mv56yi2ho6g5", isActive: true },
    { id: "cmfwr6r94000hmv56qwegzllh", name: "Deck Rigging", departmentId: "cmfwr6r5y0008mv56um3jo3ez", isActive: true },
    { id: "cmfwr6r94000mmv56mpq7cdnh", name: "Final Rigging", departmentId: "cmfwr6r570004mv56mouqlg1d", isActive: true },
    { id: "cmfwr6r94000imv56khmieqcr", name: "Capping", departmentId: "cmfwr6r5k0005mv56leylwu4o", isActive: true },
    { id: "cmfwr6rbh000umv561qu7ur41", name: "Cleaning", departmentId: "cmfwr6r6j000amv56md5pbmfe", isActive: true },
    { id: "cmfwr6rbi000wmv567v5jr36o", name: "Water Test", departmentId: "cmfwr6r5r0007mv56rezc2jv9", isActive: true }
  ],
  stations: [
    { id: "cmfwr6rco000ymv56m8bynk1b", code: "DRIG-1", name: "Deck Rigging Station 1", description: "Primary deck rigging workstation", workCenterId: "cmfwr6r94000hmv56qwegzllh", defaultPayRate: 24.00, capacity: 2, targetCycleTimeSeconds: 9000, isActive: true },
    { id: "cmfwr6rco0011mv56n62uc0sj", code: "LAM-1", name: "Lamination Station 1", description: "Main lamination work area", workCenterId: "cmfwr6r94000cmv56sa1ryiql", defaultPayRate: 22.00, capacity: 3, targetCycleTimeSeconds: 14400, isActive: true },
    { id: "cmfwr6rcp001emv569rfhss65", code: "ENG-1", name: "Engine Hang Station 1", description: "Engine installation and rigging", workCenterId: "cmfwr6r94000kmv56iidjxbj4", defaultPayRate: 28.00, capacity: 2, targetCycleTimeSeconds: 7200, isActive: true },
    { id: "cmfwr6rcp0018mv56qark6z6q", code: "HRIG-1", name: "Hull Rigging Station 1", description: "Hull assembly and rigging", workCenterId: "cmfwr6r95000rmv56pz1n5v4x", defaultPayRate: 23.00, capacity: 2, targetCycleTimeSeconds: 10800, isActive: true },
    { id: "cmfwr6rco0014mv56nhkbfzxf", code: "FRIG-1", name: "Final Rigging Station 1", description: "Final rigging and assembly", workCenterId: "cmfwr6r94000mmv56mpq7cdnh", defaultPayRate: 26.00, capacity: 2, targetCycleTimeSeconds: 10800, isActive: true },
    { id: "cmfwr6rcp001amv56scc3phfl", code: "CAP-1", name: "Capping Station 1", description: "Capping and sealing operations", workCenterId: "cmfwr6r94000imv56khmieqcr", defaultPayRate: 21.00, capacity: 2, targetCycleTimeSeconds: 5400, isActive: true },
    { id: "cmfwr6rcp001cmv56ybyjly1h", code: "CLEAN-1", name: "Cleaning Station 1", description: "Final cleaning and detailing", workCenterId: "cmfwr6rbh000umv561qu7ur41", defaultPayRate: 18.00, capacity: 2, targetCycleTimeSeconds: 3600, isActive: true },
    { id: "cmfwr6rcp0016mv56la2yxlr6", code: "WTEST-1", name: "Water Test Station 1", description: "Water testing and leak detection", workCenterId: "cmfwr6rbi000wmv567v5jr36o", defaultPayRate: 24.00, capacity: 1, targetCycleTimeSeconds: 3600, isActive: true },
    { id: "cmfwr6rco0012mv5674ynuavm", code: "QA-1", name: "QA Station 1", description: "Quality assurance and inspection", workCenterId: "cmfwr6r95000omv56qcz8jid7", defaultPayRate: 27.00, capacity: 1, targetCycleTimeSeconds: 5400, isActive: true },
    { id: "cmfwr6rez001gmv56h7f2kn9n", code: "KIT-1", name: "Kitting Station 1", description: "Parts kitting and preparation", workCenterId: "cmfwr6r94000emv56qvlppsw9", defaultPayRate: 19.00, capacity: 3, targetCycleTimeSeconds: 7200, isActive: true },
    { id: "cmfwr6rez001imv56al1dursc", code: "SHIP-1", name: "Shipping Station 1", description: "Final packaging and shipping prep", workCenterId: "cmfwr6r95000smv562kq5d6ur", defaultPayRate: 20.00, capacity: 2, targetCycleTimeSeconds: 1800, isActive: true }
  ],
  routingVersions: [
    {
      id: "cmfwr6se2001mmv56lv18hemd",
      model: "LX24",
      trim: "Base",
      featuresJson: {},
      version: 1,
      status: "RELEASED",
      releasedAt: "2025-09-23T16:12:09.145Z"
    }
  ],
  routingStages: [
    { id: "cmfwr6sgg001qmv56n8psxy66", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 2, code: "LAMINATION", name: "Lamination", enabled: true, workCenterId: "cmfwr6r94000cmv56sa1ryiql", standardStageSeconds: 14400 },
    { id: "cmfwr6sgg001omv56y3572k6m", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 1, code: "KITTING", name: "Kitting", enabled: true, workCenterId: "cmfwr6r94000emv56qvlppsw9", standardStageSeconds: 7200 },
    { id: "cmfwr6sgi001umv56pnt4ssaa", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 4, code: "DECK_RIGGING", name: "Deck Rigging", enabled: true, workCenterId: "cmfwr6r94000hmv56qwegzllh", standardStageSeconds: 9000 },
    { id: "cmfwr6sgi001wmv56ob211vku", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 5, code: "CAPPING", name: "Capping", enabled: true, workCenterId: "cmfwr6r94000imv56khmieqcr", standardStageSeconds: 5400 },
    { id: "cmfwr6sgh001smv56rhcwys96", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 3, code: "HULL_RIGGING", name: "Hull Rigging", enabled: true, workCenterId: "cmfwr6r95000rmv56pz1n5v4x", standardStageSeconds: 10800 },
    { id: "cmfwr6sgk0022mv56iijtru0f", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 8, code: "WATER_TEST", name: "Water Test", enabled: true, workCenterId: "cmfwr6rbi000wmv567v5jr36o", standardStageSeconds: 3600 },
    { id: "cmfwr6sgl0024mv56lkon4ip8", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 9, code: "QA", name: "QA", enabled: true, workCenterId: "cmfwr6r95000omv56qcz8jid7", standardStageSeconds: 5400 },
    { id: "cmfwr6sgj001ymv56own56sr9", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 6, code: "ENGINE_HANG", name: "Engine Hang", enabled: true, workCenterId: "cmfwr6r94000kmv56iidjxbj4", standardStageSeconds: 7200 },
    { id: "cmfwr6sgk0020mv56s1jm6vhm", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 7, code: "FINAL_RIGGING", name: "Final Rigging", enabled: true, workCenterId: "cmfwr6r94000mmv56mpq7cdnh", standardStageSeconds: 10800 },
    { id: "cmfwr6siq0026mv56ek2ugef6", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 10, code: "CLEANING", name: "Cleaning", enabled: true, workCenterId: "cmfwr6rbh000umv561qu7ur41", standardStageSeconds: 3600 },
    { id: "cmfwr6sir0028mv56oiz8kaa1", routingVersionId: "cmfwr6se2001mmv56lv18hemd", sequence: 11, code: "SHIPPING", name: "Shipping", enabled: true, workCenterId: "cmfwr6r95000smv562kq5d6ur", standardStageSeconds: 1800 }
  ],
  workOrders: [
    {
      id: "cmfwr6sjx002amv565vdp8f8e",
      number: "WO-1001",
      hullId: "HULL-TEST-001",
      productSku: "LX24-BASE",
      specSnapshot: {
        "trim": "Base",
        "model": "LX24",
        "stages": [
          {"code": "KITTING", "name": "Kitting", "sequence": 1},
          {"code": "LAMINATION", "name": "Lamination", "sequence": 2},
          {"code": "HULL_RIGGING", "name": "Hull Rigging", "sequence": 3},
          {"code": "DECK_RIGGING", "name": "Deck Rigging", "sequence": 4},
          {"code": "CAPPING", "name": "Capping", "sequence": 5},
          {"code": "ENGINE_HANG", "name": "Engine Hang", "sequence": 6},
          {"code": "FINAL_RIGGING", "name": "Final Rigging", "sequence": 7},
          {"code": "WATER_TEST", "name": "Water Test", "sequence": 8},
          {"code": "QA", "name": "QA", "sequence": 9},
          {"code": "CLEANING", "name": "Cleaning", "sequence": 10},
          {"code": "SHIPPING", "name": "Shipping", "sequence": 11}
        ],
        "features": {},
        "routingVersionId": "cmfwr6se2001mmv56lv18hemd"
      },
      qty: 1,
      status: "IN_PROGRESS",
      routingVersionId: "cmfwr6se2001mmv56lv18hemd",
      currentStageIndex: 1,
      createdAt: "2025-09-23T16:12:09.357Z"
    }
  ],
  woStageLogs: [
    {
      id: "cmfy58z7m0001mm8pu1ia1crc",
      workOrderId: "cmfwr6sjx002amv565vdp8f8e",
      routingStageId: "cmfwr6sgg001omv56y3572k6m",
      stationId: "cmfwr6rez001gmv56h7f2kn9n",
      userId: "cmfwr6s9e001lmv567pcikcpy",
      event: "START",
      goodQty: 0,
      scrapQty: 0,
      note: null,
      createdAt: "2025-09-24T15:33:32.098Z"
    },
    {
      id: "cmfy59oq60003mm8p2wtr0vac",
      workOrderId: "cmfwr6sjx002amv565vdp8f8e",
      routingStageId: "cmfwr6sgg001omv56y3572k6m",
      stationId: "cmfwr6rez001gmv56h7f2kn9n",
      userId: "cmfwr6s9e001lmv567pcikcpy",
      event: "COMPLETE",
      goodQty: 1,
      scrapQty: 0,
      note: "Kits are ready to go.",
      createdAt: "2025-09-24T15:34:05.166Z"
    },
    {
      id: "cmfy5avk10005mm8p0ffv1qi8",
      workOrderId: "cmfwr6sjx002amv565vdp8f8e",
      routingStageId: "cmfwr6sgg001qmv56n8psxy66",
      stationId: "cmfwr6rco0011mv56n62uc0sj",
      userId: "cmfwr6s9e001lmv567pcikcpy",
      event: "START",
      goodQty: 0,
      scrapQty: 0,
      note: null,
      createdAt: "2025-09-24T15:35:00.673Z"
    }
  ],
  productModels: [
    {
      id: "cmg6o0tot0000vwgdgtbkfgkw",
      name: "LX24",
      description: "24-foot luxury boat model",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.805Z"
    },
    {
      id: "cmg6o0tot0001vwgdytuxaj48",
      name: "LX26",
      description: "26-foot luxury boat model",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.805Z"
    }
  ],
  productTrims: [
    {
      id: "cmg6o0tou0002vwgd8ht7mklp",
      productModelId: "cmg6o0tot0000vwgdgtbkfgkw",
      name: "Base",
      description: "Entry-level trim with essential features",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.810Z"
    },
    {
      id: "cmg6o0tou0003vwgdp9x4nqrs",
      productModelId: "cmg6o0tot0000vwgdgtbkfgkw",
      name: "Sport",
      description: "Performance-oriented trim with enhanced features",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.811Z"
    },
    {
      id: "cmg6o0tou0004vwgdt2y5wvnm",
      productModelId: "cmg6o0tot0000vwgdgtbkfgkw",
      name: "Luxury",
      description: "Premium trim with luxury amenities and finishes",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.812Z"
    },
    {
      id: "cmg6o0tou0005vwgdx7k9plqw",
      productModelId: "cmg6o0tot0001vwgdytuxaj48",
      name: "Base",
      description: "Entry-level trim with essential features",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.813Z"
    },
    {
      id: "cmg6o0tou0006vwgdm4r8szbn",
      productModelId: "cmg6o0tot0001vwgdytuxaj48",
      name: "Sport",
      description: "Performance-oriented trim with enhanced features",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.814Z"
    },
    {
      id: "cmg6o0tou0007vwgdq9t3hxyz",
      productModelId: "cmg6o0tot0001vwgdytuxaj48",
      name: "Luxury",
      description: "Premium trim with luxury amenities and finishes",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.815Z"
    },
    {
      id: "cmg6o0tou0008vwgdv6p2mjkl",
      productModelId: "cmg6o0tot0001vwgdytuxaj48",
      name: "Premium",
      description: "Top-tier trim with all available features and upgrades",
      isActive: true,
      createdAt: "2025-09-30T14:41:13.816Z"
    }
  ],
  equipment: [
    { id: "cmeq001", name: "Rivet Gun", description: "Pneumatic rivet gun for hull assembly", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmeq002", name: "Spray Booth", description: "Paint and coating spray booth", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmeq003", name: "Engine Hoist", description: "2-ton engine hoist for installation", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmeq004", name: "Lamination Table", description: "Large work table for lamination", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmeq005", name: "Pressure Washer", description: "Industrial pressure washer", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmeq006", name: "Leak Detector", description: "Electronic leak detection system", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" }
  ],
  stationEquipment: [
    { id: "cmsteq001", stationId: "cmfwr6rcp0018mv56qark6z6q", equipmentId: "cmeq001", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmsteq002", stationId: "cmfwr6rco0011mv56n62uc0sj", equipmentId: "cmeq004", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmsteq003", stationId: "cmfwr6rcp001emv569rfhss65", equipmentId: "cmeq003", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmsteq004", stationId: "cmfwr6rcp001cmv56ybyjly1h", equipmentId: "cmeq005", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmsteq005", stationId: "cmfwr6rcp0016mv56la2yxlr6", equipmentId: "cmeq006", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmsteq006", stationId: "cmfwr6rco000ymv56m8bynk1b", equipmentId: "cmeq002", createdAt: "2025-09-23T16:12:09.145Z" }
  ],
  stationMembers: [
    { id: "cmstmem001", stationId: "cmfwr6rcp0018mv56qark6z6q", userId: "cmfwr6s9e001lmv567pcikcpy", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmstmem002", stationId: "cmfwr6rez001gmv56h7f2kn9n", userId: "cmfwr6s9e001lmv567pcikcpy", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmstmem003", stationId: "cmfwr6rco0011mv56n62uc0sj", userId: "cmfwr6s9e001mmv56newuser01", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmstmem004", stationId: "cmfwr6rco000ymv56m8bynk1b", userId: "cmfwr6s9e001nmv56newuser02", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmstmem005", stationId: "cmfwr6rcp0018mv56qark6z6q", userId: "cmfwr6s9e001kmv5660mr74fo", isActive: true, createdAt: "2025-09-23T16:12:09.145Z" }
  ],
  payRateHistory: [
    { id: "cmprh001", userId: "cmfwr6s9e001lmv567pcikcpy", oldRate: null, newRate: 22.50, changedBy: "cmfwr6s9e001jmv5659vvhrqm", reason: "Initial rate", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmprh002", userId: "cmfwr6s9e001kmv5660mr74fo", oldRate: null, newRate: 35.00, changedBy: "cmfwr6s9e001jmv5659vvhrqm", reason: "Initial rate", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmprh003", userId: "cmfwr6s9e001jmv5659vvhrqm", oldRate: null, newRate: 45.00, changedBy: "cmfwr6s9e001jmv5659vvhrqm", reason: "Initial rate", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmprh004", userId: "cmfwr6s9e001mmv56newuser01", oldRate: null, newRate: 20.00, changedBy: "cmfwr6s9e001jmv5659vvhrqm", reason: "Initial rate", createdAt: "2025-09-23T16:12:09.145Z" },
    { id: "cmprh005", userId: "cmfwr6s9e001nmv56newuser02", oldRate: null, newRate: 25.00, changedBy: "cmfwr6s9e001jmv5659vvhrqm", reason: "Initial rate", createdAt: "2025-09-23T16:12:09.145Z" }
  ],
  stationMetrics: [],
  workOrderNotes: [],
  workOrderAttachments: [],
  workOrderVersions: [],
  workInstructionVersions: []
};