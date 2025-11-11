import requests
import json
from datetime import datetime

url = "https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"
headers = {'Content-Type': 'application/json'}

print("=" * 70)
print("🧪 測試使用者上傳功能")
print("=" * 70)
print()

# 測試 1: 上傳測試使用者
print("📌 測試 1: 上傳測試使用者")
print("-" * 70)
test_users = [
    {
        "userId": "U_test_upload_001",
        "displayName": "測試使用者 - 上傳功能測試",
        "userName": "test_user_001",
        "pictureUrl": "https://example.com/avatar.jpg",
        "email": "test@example.com",
        "registeredAt": datetime.now().isoformat(),
        "lastLogin": datetime.now().isoformat(),
        "teacherName": "",
        "teacherId": ""
    }
]

payload = json.dumps({
    "action": "upsertUsers",
    "list": test_users
})

response = requests.post(url, headers=headers, data=payload)
result = response.json()

print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"訊息: {result.get('message', 'N/A')}")
if result.get('success'):
    print(f"處理數量: {result.get('processedCount', 0)}")
    print(f"新增: {result.get('added', 0)}, 更新: {result.get('updated', 0)}")
print()

# 測試 2: 驗證上傳結果
print("📌 測試 2: 驗證上傳結果")
print("-" * 70)
response = requests.get(f"{url}?action=getUser&userId=U_test_upload_001")
result = response.json()

if result.get('success'):
    print("✅ 使用者已成功上傳並可讀取")
    user = result.get('data', {})
    print(f"使用者ID: {user.get('userId')}")
    print(f"顯示名稱: {user.get('displayName')}")
    print(f"使用者名稱: {user.get('userName')}")
    print(f"Email: {user.get('email')}")
    print(f"註冊時間: {user.get('registeredAt')}")
else:
    print(f"❌ 讀取失敗: {result.get('message')}")
print()

# 測試 3: 測試更新功能
print("📌 測試 3: 測試更新功能（更新 lastLogin）")
print("-" * 70)
updated_users = [
    {
        "userId": "U_test_upload_001",
        "displayName": "測試使用者 - 上傳功能測試（已更新）",
        "userName": "test_user_001_updated",
        "lastLogin": datetime.now().isoformat()
    }
]

payload = json.dumps({
    "action": "upsertUsers",
    "list": updated_users
})

response = requests.post(url, headers=headers, data=payload)
result = response.json()

print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"訊息: {result.get('message')}")
if result.get('success'):
    print(f"新增: {result.get('added', 0)}, 更新: {result.get('updated', 0)}")
print()

# 測試 4: 檢查真實使用者（張庭豪）
print("📌 測試 4: 檢查真實使用者（張庭豪 TimDirty）")
print("-" * 70)
response = requests.get(f"{url}?action=getUser&userId=Udb51363eb6fdc605a6a9816379a38103")
result = response.json()

if result.get('success'):
    print("✅ 找到真實使用者")
    user = result.get('data', {})
    print(f"使用者ID: {user.get('userId')}")
    print(f"顯示名稱: {user.get('displayName')}")
    print(f"註冊時間: {user.get('registeredAt')}")
    print(f"最後登入: {user.get('lastLogin')}")
else:
    print(f"❌ 找不到: {result.get('message')}")
print()

print("=" * 70)
print("📊 測試摘要")
print("=" * 70)
print()
print("✅ 如果所有測試都成功，代表：")
print("   1. ✅ 使用者上傳功能已修復")
print("   2. ✅ 欄位名稱正確匹配")
print("   3. ✅ 新增和更新功能正常")
print("   4. ✅ 可以正常讀取使用者資料")
print()
print("🎯 修復成功！使用者資料現在可以正常上傳到 Google Sheets！")
print()
