import requests
import json
from datetime import datetime

url = "https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"
headers = {'Content-Type': 'application/json'}

print("=" * 60)
print("🧪 測試群組自動上傳功能")
print("=" * 60)
print()

# 測試 1: 讀取現有群組
print("📌 測試 1: 讀取現有群組資料")
print("-" * 60)
response = requests.get(f"{url}?action=listAllGroups")
result = response.json()
print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"總數: {result.get('total', 0)}")
if result.get('data'):
    print(f"現有群組: {len(result['data'])} 個")
    for group in result['data'][:3]:
        print(f"  - {group.get('groupName', 'N/A')} ({group.get('groupId', 'N/A')})")
print()

# 測試 2: 上傳測試群組（模擬 LINE Bot 自動上傳）
print("📌 測試 2: 上傳新群組（模擬自動上傳）")
print("-" * 60)
test_groups = [
    {
        "groupId": "C_test_auto_upload_001",
        "groupName": "測試群組 - 自動上傳功能測試",
        "type": "group",
        "firstSeenAt": datetime.now().isoformat(),
        "lastActivityAt": datetime.now().isoformat(),
        "memberCount": 5,
        "description": "由自動上傳功能測試建立"
    }
]

payload = json.dumps({
    "action": "upsertGroups",
    "list": test_groups
})
response = requests.post(url, headers=headers, data=payload)
result = response.json()
print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"訊息: {result.get('message', 'N/A')}")
print(f"處理數量: {result.get('processedCount', 0)}")
print(f"新增: {result.get('added', 0)}, 更新: {result.get('updated', 0)}")
print()

# 測試 3: 驗證上傳結果
print("📌 測試 3: 驗證上傳結果")
print("-" * 60)
response = requests.get(f"{url}?action=getGroup&groupId=C_test_auto_upload_001")
result = response.json()
if result.get('success'):
    print("✅ 群組已成功上傳並可讀取")
    group = result.get('data', {})
    print(f"群組名稱: {group.get('groupName')}")
    print(f"群組ID: {group.get('groupId')}")
    print(f"類型: {group.get('type')}")
    print(f"成員數: {group.get('memberCount')}")
else:
    print(f"❌ 讀取失敗: {result.get('message')}")
print()

# 測試 4: 測試更新功能（模擬群組活動更新）
print("📌 測試 4: 更新群組活動（模擬自動更新）")
print("-" * 60)
updated_groups = [
    {
        "groupId": "C_test_auto_upload_001",
        "groupName": "測試群組 - 自動上傳功能測試（已更新）",
        "type": "group",
        "lastActivityAt": datetime.now().isoformat(),
        "memberCount": 8,
        "description": "活動已更新"
    }
]

payload = json.dumps({
    "action": "upsertGroups",
    "list": updated_groups
})
response = requests.post(url, headers=headers, data=payload)
result = response.json()
print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"訊息: {result.get('message', 'N/A')}")
print(f"新增: {result.get('added', 0)}, 更新: {result.get('updated', 0)}")
print()

print("=" * 60)
print("📊 測試摘要")
print("=" * 60)
print()
print("✅ 如果所有測試都成功，代表：")
print("   1. ✅ Google Sheets 群組資料表已建立")
print("   2. ✅ upsertGroups API 正常運作")
print("   3. ✅ 群組資料可以正常讀取")
print("   4. ✅ 群組資料可以正常更新")
print("   5. ✅ 自動上傳功能已就緒")
print()
print("🎯 LINE Bot 現在可以自動上傳群組ID到 Google Sheets！")
print()
