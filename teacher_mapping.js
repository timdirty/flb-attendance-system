// 講師ID對應表
// 最後更新時間: 2025-09-15T12:13:58.297799
const teacherIdMapping = {
    "Yoki 🙏🏻": "Ucf9b239b708001ed44f0710704282655",
    "Tim": "Udb51363eb6fdc605a6a9816379a38103",
    "Ted": "U213b36e8024ab1d2b895b24082c21270",
    "Agnes": "U8427f9e5cc1fd485a7fba84152776f2c",
    "Hansen": "U73d377e2bcaedb439eaa8c757f623666",
    "James": "Uebfe9bd644976914003e99254d46764c",
    "Ivan": "Udba73eb49b16cfd091181bf589efdca0",
    "Xian": "Uce2bdcaa734d11a8aa0558c96ba1dad9",
    "Eason": "U99233a941eaab5298c1a4d77127ccfd9",
    "Bella": "Uad4a371309913a867e530e582684d853",
    "Gillian": "U5f859c4f8a6cfcb602c0a26b2f61ec64",
    "Daniel": "Uec1772181e34b968bf2671d249128ff5",
    "Philp": "Ud52773d731c5ce7d3890e44d5750f2de",
    "Dirty": "U0291ce9023f7911a99cf79a54be90de8"
};

// 根據講師名稱查找對應的LINE ID
function findTeacherLineId(teacherName) {
    return teacherIdMapping[teacherName] || null;
}

// 根據LINE ID查找對應的講師名稱
function findTeacherNameByLineId(lineId) {
    for (const [name, id] of Object.entries(teacherIdMapping)) {
        if (id === lineId) {
            return name;
        }
    }
    return null;
}

// 獲取所有講師名稱列表
function getAllTeacherNames() {
    return Object.keys(teacherIdMapping);
}

// 獲取所有LINE ID列表
function getAllLineIds() {
    return Object.values(teacherIdMapping);
}

// 檢查講師是否存在
function isTeacherExists(teacherName) {
    return teacherName in teacherIdMapping;
}

// 檢查LINE ID是否存在
function isLineIdExists(lineId) {
    return Object.values(teacherIdMapping).includes(lineId);
}

// 獲取講師總數
function getTeacherCount() {
    return Object.keys(teacherIdMapping).length;
}

// 導出模組
module.exports = {
    teacherIdMapping,
    findTeacherLineId,
    findTeacherNameByLineId,
    getAllTeacherNames,
    getAllLineIds,
    isTeacherExists,
    isLineIdExists,
    getTeacherCount
};
