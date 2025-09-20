"""
FLB 簽到系統 Python SDK
版本: 1.0.0
作者: FLB 開發團隊
"""

import requests
import json
from datetime import datetime
from typing import Optional, List, Dict, Any
import time


class FLBAttendanceSDK:
    """FLB 簽到系統 Python SDK"""
    
    def __init__(self, base_url: str = "https://liff-sttendence-0908-production.up.railway.app", 
                 timeout: int = 30, retry_attempts: int = 3, retry_delay: float = 1.0):
        """
        初始化 SDK
        
        Args:
            base_url: API 基礎 URL
            timeout: 請求超時時間（秒）
            retry_attempts: 重試次數
            retry_delay: 重試延遲時間（秒）
        """
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout
        self.retry_attempts = retry_attempts
        self.retry_delay = retry_delay
        self.api_key = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'FLB-Attendance-SDK-Python/1.0.0'
        })
    
    def set_api_key(self, api_key: str) -> None:
        """設置 API 金鑰"""
        self.api_key = api_key
        if api_key:
            self.session.headers.update({'Authorization': f'Bearer {api_key}'})
        else:
            self.session.headers.pop('Authorization', None)
    
    def _make_request(self, method: str, endpoint: str, data: Optional[Dict] = None) -> Dict[str, Any]:
        """
        執行 API 請求（包含重試機制）
        
        Args:
            method: HTTP 方法
            endpoint: API 端點
            data: 請求數據
            
        Returns:
            API 回應數據
            
        Raises:
            Exception: 請求失敗時拋出異常
        """
        url = f"{self.base_url}{endpoint}"
        
        for attempt in range(1, self.retry_attempts + 1):
            try:
                if method.upper() == 'GET':
                    response = self.session.get(url, timeout=self.timeout)
                elif method.upper() == 'POST':
                    response = self.session.post(url, json=data, timeout=self.timeout)
                else:
                    raise ValueError(f"不支援的 HTTP 方法: {method}")
                
                response.raise_for_status()
                return response.json()
                
            except requests.exceptions.RequestException as e:
                print(f"API 請求失敗 (嘗試 {attempt}/{self.retry_attempts}): {str(e)}")
                
                if attempt == self.retry_attempts:
                    raise Exception(f"API 請求失敗，已重試 {self.retry_attempts} 次: {str(e)}")
                
                # 等待後重試
                time.sleep(self.retry_delay * attempt)
    
    def get_teachers(self) -> Dict[str, Any]:
        """獲取講師列表"""
        return self._make_request('GET', '/api/teachers')
    
    def get_courses(self, teacher: str) -> Dict[str, Any]:
        """獲取講師課程"""
        return self._make_request('POST', '/api/courses', {'teacher': teacher})
    
    def get_students(self, course: str, time: str, date: Optional[str] = None) -> Dict[str, Any]:
        """獲取課程學生"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        return self._make_request('POST', '/api/course-students', {
            'course': course,
            'time': time,
            'date': date
        })
    
    def mark_student_attendance(self, student_name: str, present: bool, 
                              teacher_name: str, course_name: str, 
                              date: Optional[str] = None) -> Dict[str, Any]:
        """學生簽到"""
        if date is None:
            date = datetime.now().strftime('%Y-%m-%d')
        
        return self._make_request('POST', '/api/student-attendance', {
            'studentName': student_name,
            'date': date,
            'present': present,
            'teacherName': teacher_name,
            'courseName': course_name
        })
    
    def teacher_checkin(self, teacher_name: str, course_name: str, course_time: str,
                       student_count: int, course_content: str, 
                       date: Optional[str] = None, web_api: str = '') -> Dict[str, Any]:
        """講師簽到"""
        if date is None:
            today = datetime.now()
            date = today.strftime('%Y/%m/%d')
        
        return self._make_request('POST', '/api/teacher-report', {
            'teacherName': teacher_name,
            'courseName': course_name,
            'courseTime': course_time,
            'date': date,
            'studentCount': student_count,
            'courseContent': course_content,
            'webApi': web_api
        })
    
    def get_direct_step3_url(self, teacher: str, course: str, time: str) -> Dict[str, Any]:
        """獲取直接跳轉 URL"""
        return self._make_request('POST', '/api/direct-step3', {
            'teacher': teacher,
            'course': course,
            'time': time
        })
    
    def get_direct_step3_page_url(self, teacher: str, course: str, time: str) -> str:
        """獲取直接步驟三頁面 URL"""
        from urllib.parse import urlencode
        params = {
            'teacher': teacher,
            'course': course,
            'time': time
        }
        return f"{self.base_url}/step3?{urlencode(params)}"
    
    def batch_mark_attendance(self, attendance_list: List[Dict[str, Any]], 
                            teacher_name: str, course_name: str, 
                            date: Optional[str] = None) -> List[Dict[str, Any]]:
        """批量學生簽到"""
        results = []
        
        for attendance in attendance_list:
            try:
                result = self.mark_student_attendance(
                    attendance['student_name'],
                    attendance['present'],
                    teacher_name,
                    course_name,
                    date
                )
                results.append({
                    'student_name': attendance['student_name'],
                    'success': result.get('success', False),
                    'error': result.get('error')
                })
            except Exception as e:
                results.append({
                    'student_name': attendance['student_name'],
                    'success': False,
                    'error': str(e)
                })
        
        return results
    
    def validate_teacher(self, teacher_name: str) -> bool:
        """驗證講師是否存在"""
        try:
            teachers = self.get_teachers()
            return (teachers.get('success', False) and 
                    any(t['name'] == teacher_name for t in teachers.get('teachers', [])))
        except Exception as e:
            print(f"驗證講師失敗: {e}")
            return False
    
    def validate_course(self, teacher_name: str, course_name: str, course_time: str) -> bool:
        """驗證課程是否存在"""
        try:
            courses = self.get_courses(teacher_name)
            return (courses.get('success', False) and 
                    any(c['course'] == course_name and c['time'] == course_time 
                        for c in courses.get('courseTimes', [])))
        except Exception as e:
            print(f"驗證課程失敗: {e}")
            return False
    
    def get_course_stats(self, course: str, time: str, date: Optional[str] = None) -> Dict[str, Any]:
        """獲取課程統計"""
        try:
            students = self.get_students(course, time, date)
            
            if not students.get('success', False):
                return {'success': False, 'error': students.get('error')}
            
            stats = {
                'total': len(students.get('students', [])),
                'present': 0,
                'absent': 0,
                'leave': 0,
                'not_signed_in': 0
            }
            
            for student in students.get('students', []):
                attendance_status = student.get('hasAttendanceToday')
                if attendance_status is True:
                    stats['present'] += 1
                elif attendance_status is False:
                    stats['absent'] += 1
                elif attendance_status == 'leave':
                    stats['leave'] += 1
                else:
                    stats['not_signed_in'] += 1
            
            return {
                'success': True,
                'stats': stats,
                'students': students.get('students', [])
            }
        except Exception as e:
            return {'success': False, 'error': str(e)}
    
    def get_teacher_info(self, teacher_name: str) -> Optional[Dict[str, Any]]:
        """獲取講師詳細資訊"""
        try:
            teachers = self.get_teachers()
            if teachers.get('success', False):
                for teacher in teachers.get('teachers', []):
                    if teacher['name'] == teacher_name:
                        return teacher
            return None
        except Exception as e:
            print(f"獲取講師資訊失敗: {e}")
            return None


# 使用範例
if __name__ == "__main__":
    # 初始化 SDK
    sdk = FLBAttendanceSDK(
        base_url="https://liff-sttendence-0908-production.up.railway.app",
        timeout=30,
        retry_attempts=3
    )
    
    # 設置 API 金鑰（如果有的話）
    # sdk.set_api_key('your-api-key')
    
    try:
        # 獲取講師列表
        print("=== 獲取講師列表 ===")
        teachers = sdk.get_teachers()
        print(f"講師列表: {json.dumps(teachers, ensure_ascii=False, indent=2)}")
        
        # 驗證講師
        print("\n=== 驗證講師 ===")
        is_valid = sdk.validate_teacher("Tim")
        print(f"講師 Tim 是否存在: {is_valid}")
        
        # 獲取課程
        print("\n=== 獲取課程 ===")
        courses = sdk.get_courses("Tim")
        print(f"課程列表: {json.dumps(courses, ensure_ascii=False, indent=2)}")
        
        # 獲取學生
        print("\n=== 獲取學生 ===")
        students = sdk.get_students("SPM 南京復興教室", "日 1330-1500 松山")
        print(f"學生列表: {json.dumps(students, ensure_ascii=False, indent=2)}")
        
        # 獲取課程統計
        print("\n=== 獲取課程統計 ===")
        stats = sdk.get_course_stats("SPM 南京復興教室", "日 1330-1500 松山")
        print(f"課程統計: {json.dumps(stats, ensure_ascii=False, indent=2)}")
        
        # 學生簽到
        print("\n=== 學生簽到 ===")
        attendance_result = sdk.mark_student_attendance(
            "張小明", True, "Tim", "SPM 南京復興教室"
        )
        print(f"簽到結果: {json.dumps(attendance_result, ensure_ascii=False, indent=2)}")
        
        # 講師簽到
        print("\n=== 講師簽到 ===")
        teacher_result = sdk.teacher_checkin(
            "Tim", "SPM 南京復興教室", "日 1330-1500 松山", 
            5, "數學課程內容"
        )
        print(f"講師簽到結果: {json.dumps(teacher_result, ensure_ascii=False, indent=2)}")
        
        # 批量簽到
        print("\n=== 批量簽到 ===")
        attendance_list = [
            {"student_name": "張小明", "present": True},
            {"student_name": "李小花", "present": False},
            {"student_name": "王大華", "present": True}
        ]
        batch_result = sdk.batch_mark_attendance(attendance_list, "Tim", "SPM 南京復興教室")
        print(f"批量簽到結果: {json.dumps(batch_result, ensure_ascii=False, indent=2)}")
        
    except Exception as e:
        print(f"錯誤: {e}")
