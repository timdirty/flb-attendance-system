import requests
import json

url = "https://script.google.com/macros/s/AKfycbzm0GD-T09Botbs52e8PyeVuA5slJh6Z0AQ7I0uUiGZiE6aWhTO2D0d3XHFrdLNv90uCw/exec"

# 測試 1: getStudentList
print("=" * 50)
print("測試 1: getStudentList")
print("=" * 50)
payload = json.dumps({"action": "getStudentList"})
headers = {'Content-Type': 'application/json'}
response = requests.post(url, headers=headers, data=payload)
print(f"狀態碼: {response.status_code}")
print(f"回應: {response.text[:200]}...")
print()

# 測試 2: getCoursesForSelect
print("=" * 50)
print("測試 2: getCoursesForSelect")
print("=" * 50)
payload = json.dumps({"action": "getCoursesForSelect"})
response = requests.post(url, headers=headers, data=payload)
result = response.json()
print(f"成功: {result.get('success')}")
if result.get('courses'):
    print(f"課程數量: {len(result['courses'])}")
    print(f"課程: {result['courses'][:5]}")
print()

# 測試 3: getCoursesByTeacher
print("=" * 50)
print("測試 3: getCoursesByTeacher")
print("=" * 50)
payload = json.dumps({"action": "getCoursesByTeacher", "teacher": "Test"})
response = requests.post(url, headers=headers, data=payload)
result = response.json()
print(f"成功: {result.get('success')}")
print(f"老師: {result.get('teacher')}")
print()

print("✅ 所有測試完成！")
