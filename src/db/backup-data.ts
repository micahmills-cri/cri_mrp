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
      departmentId: null
    },
    {
      id: "cmfwr6s9e001kmv5660mr74fo",
      email: "supervisor@cri.local",
      passwordHash: "$2b$12$Om0qEF9ScNotcaDnoqY4h.FTfxf5TkPOiM.nMPEFKOYLosf.Q0V2e",
      role: "SUPERVISOR",
      departmentId: "cmfwr6r660009mv56j89zqwqk"
    },
    {
      id: "cmfwr6s9e001lmv567pcikcpy",
      email: "operator@cri.local",
      passwordHash: "$2b$12$NL98avVAWBajkgLuavY2AOnHplC.ws6tUaYaU/noj09coe5fbOOR6",
      role: "OPERATOR",
      departmentId: "cmfwr6r660009mv56j89zqwqk"
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
    { id: "cmfwr6rco000ymv56m8bynk1b", code: "DRIG-1", name: "Deck Rigging Station 1", workCenterId: "cmfwr6r94000hmv56qwegzllh", isActive: true },
    { id: "cmfwr6rco0011mv56n62uc0sj", code: "LAM-1", name: "Lamination Station 1", workCenterId: "cmfwr6r94000cmv56sa1ryiql", isActive: true },
    { id: "cmfwr6rcp001emv569rfhss65", code: "ENG-1", name: "Engine Hang Station 1", workCenterId: "cmfwr6r94000kmv56iidjxbj4", isActive: true },
    { id: "cmfwr6rcp0018mv56qark6z6q", code: "HRIG-1", name: "Hull Rigging Station 1", workCenterId: "cmfwr6r95000rmv56pz1n5v4x", isActive: true },
    { id: "cmfwr6rco0014mv56nhkbfzxf", code: "FRIG-1", name: "Final Rigging Station 1", workCenterId: "cmfwr6r94000mmv56mpq7cdnh", isActive: true },
    { id: "cmfwr6rcp001amv56scc3phfl", code: "CAP-1", name: "Capping Station 1", workCenterId: "cmfwr6r94000imv56khmieqcr", isActive: true },
    { id: "cmfwr6rcp001cmv56ybyjly1h", code: "CLEAN-1", name: "Cleaning Station 1", workCenterId: "cmfwr6rbh000umv561qu7ur41", isActive: true },
    { id: "cmfwr6rcp0016mv56la2yxlr6", code: "WTEST-1", name: "Water Test Station 1", workCenterId: "cmfwr6rbi000wmv567v5jr36o", isActive: true },
    { id: "cmfwr6rco0012mv5674ynuavm", code: "QA-1", name: "QA Station 1", workCenterId: "cmfwr6r95000omv56qcz8jid7", isActive: true },
    { id: "cmfwr6rez001gmv56h7f2kn9n", code: "KIT-1", name: "Kitting Station 1", workCenterId: "cmfwr6r94000emv56qvlppsw9", isActive: true },
    { id: "cmfwr6rez001imv56al1dursc", code: "SHIP-1", name: "Shipping Station 1", workCenterId: "cmfwr6r95000smv562kq5d6ur", isActive: true }
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
  productTrims: [],
  workOrderNotes: [],
  workOrderAttachments: [],
  workOrderVersions: [],
  workInstructionVersions: []
};