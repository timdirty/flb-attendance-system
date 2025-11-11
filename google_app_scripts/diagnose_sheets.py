import requests
import json

url = "https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"
headers = {'Content-Type': 'application/json'}

print("=" * 70)
print("🔍 診斷 Google Sheets 資料狀態")
print("=" * 70)
print()

# 1. 檢查群組資料
print("📌 1. 檢查群組資料表")
print("-" * 70)
response = requests.get(f"{url}?action=listAllGroups")
result = response.json()

if result.get('success'):
    groups = result.get('data', [])
    print(f"✅ API 回應成功")
    print(f"📊 總群組數: {result.get('total', 0)}")
    print()
    
    # 查找 FLB CORE 群組
    flb_core = None
    for group in groups:
        if group.get('groupId') == 'C9cd9530405411fdd46de96f4e6cdecb7':
            flb_core = group
            break
    
    if flb_core:
        print("✅ 找到 FLB CORE 群組！")
        print(f"   群組ID: {flb_core.get('groupId')}")
        print(f"   群組名稱: {flb_core.get('groupName')}")
        print(f"   類型: {flb_core.get('type')}")
        print(f"   首次偵測: {flb_core.get('firstSeenAt')}")
        print(f"   最後活動: {flb_core.get('lastActivityAt')}")
        print(f"   成員數: {flb_core.get('memberCount')}")
    else:
        print("❌ 未找到 FLB CORE 群組")
        print("   這可能表示資料沒有真正寫入 Google Sheets")
        print()
        print("   現有群組列表：")
        for i, group in enumerate(groups[:5], 1):
            print(f"   {i}. {group.get('groupName')} ({group.get('groupId')})")
else:
    print(f"❌ API 失敗: {result.get('message')}")
print()

# 2. 檢查使用者資料
print("📌 2. 檢查使用者資料表")
print("-" * 70)
response = requests.get(f"{url}?action=listAllUsers")
result = response.json()

if result.get('success'):
    users = result.get('data', [])
    print(f"✅ API 回應成功")
    print(f"👥 總使用者數: {result.get('total', 0)}")
    print()
    
    # 查找張庭豪
    user = None
    for u in users:
        if u.get('userId') == 'Udb51363eb6fdc605a6a9816379a38103':
            user = u
            break
    
    if user:
        print("✅ 找到張庭豪 TimDirty！")
        print(f"   使用者ID: {user.get('userId')}")
        print(f"   顯示名稱: {user.get('displayName')}")
        print(f"   使用者名稱: {user.get('userName')}")
        print(f"   註冊時間: {user.get('registeredAt')}")
        print(f"   最後登入: {user.get('lastLogin')}")
    else:
        print("❌ 未找到張庭豪 TimDirty")
        print("   這可能表示使用者資料沒有真正寫入 Google Sheets")
else:
    print(f"❌ API 失敗: {result.get('message')}")
print()

# 3. 測試直接寫入
print("📌 3. 測試直接寫入群組資料")
print("-" * 70)
test_payload = {
    "action": "upsertGroups",
    "list": [{
        "groupId": "C9cd9530405411fdd46de96f4e6cdecb7",
        "groupName": "FLB CORE",
        "type": "group",
        "firstSeenAt": "2025-10-20T10:00:00.000Z",
        "lastActivityAt": "2025-10-20T10:30:00.000Z",
        "memberCount": 10,
        "description": "診斷測試"
    }]
}

response = requests.post(url, headers=headers, data=json.dumps(test_payload))
result = response.json()

print(f"狀態: {'✅ 成功' if result.get('success') else '❌ 失敗'}")
print(f"訊息: {result.get('message')}")
if result.get('success'):
    print(f"處理數量: {result.get('processedCount')}")
    print(f"新增: {result.get('added')}, 更新: {result.get('updated')}")
print()

print("=" * 70)
print("💡 診斷建議")
print("=" * 70)
print()
print("如果：")
print("  • API 回應成功 ✅ 但找不到資料 ❌")
print("    → 請檢查您開啟的是否為正確的 Google Sheets 試算表")
print("    → 確認試算表 ID 是否為: 1A2dPb0iyvaqVGTOKqGcsq7aC6UHNttVcJ82r-G0xevk")
print()
print("  • 可以讀取到資料 ✅")
print("    → 請重新整理 Google Sheets 頁面（Ctrl+R 或 Cmd+R）")
print("    → 檢查工作表名稱是否正確：「群組資料表 (groups)」")
print()
print("  • 測試寫入成功 ✅")
print("    → 請再次檢查 Google Sheets，應該可以看到資料了")
print()
