#!/usr/bin/env python3

import requests
import json
import sys
from datetime import datetime
from typing import Dict, Optional

# Test configuration
BASE_URL = "https://help-nearby-8.preview.emergentagent.com/api"

class SolveConnectTester:
    def __init__(self):
        self.base_url = BASE_URL
        self.helper_token = None
        self.need_help_token = None
        self.helper_user_id = None
        self.need_help_user_id = None
        self.job_id = None
        self.test_results = []
        
    def log_test(self, test_name: str, success: bool, details: str = ""):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        self.test_results.append({
            "test": test_name,
            "success": success,
            "details": details,
            "timestamp": datetime.now().isoformat()
        })
        print(f"{status}: {test_name}")
        if details:
            print(f"    Details: {details}")
        print()
    
    def make_request(self, method: str, endpoint: str, data: dict = None, token: str = None) -> Dict:
        """Make HTTP request with error handling"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        try:
            if method.upper() == "GET":
                response = requests.get(url, headers=headers, params=data)
            elif method.upper() == "POST":
                response = requests.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = requests.put(url, headers=headers, json=data)
            else:
                raise ValueError(f"Unsupported HTTP method: {method}")
            
            return {
                "status_code": response.status_code,
                "data": response.json() if response.text else {},
                "success": 200 <= response.status_code < 300
            }
        except requests.exceptions.RequestException as e:
            return {
                "status_code": 0,
                "data": {"error": str(e)},
                "success": False
            }
        except json.JSONDecodeError:
            return {
                "status_code": response.status_code,
                "data": {"error": "Invalid JSON response", "text": response.text},
                "success": False
            }
    
    def test_authentication(self):
        """Test authentication APIs"""
        print("=== TESTING AUTHENTICATION APIS ===\n")
        
        # Test 1: Register helper user
        import uuid
        unique_id = str(uuid.uuid4())[:8]
        helper_data = {
            "email": f"sarah.helper.{unique_id}@example.com",
            "password": "SecurePass123!",
            "name": "Sarah Wilson",
            "role": "helper",
            "skills": ["plumbing", "electrical", "carpentry"]
        }
        
        result = self.make_request("POST", "/auth/register", helper_data)
        if result["success"]:
            self.helper_token = result["data"]["access_token"]
            self.helper_user_id = result["data"]["user_id"]
            self.log_test("Register Helper User", True, f"User ID: {self.helper_user_id}")
        else:
            self.log_test("Register Helper User", False, f"Status: {result['status_code']}, Data: {result['data']}")
        
        # Test 2: Register need_help user
        need_help_data = {
            "email": f"john.customer.{unique_id}@example.com", 
            "password": "SecurePass123!",
            "name": "John Smith",
            "role": "need_help"
        }
        
        result = self.make_request("POST", "/auth/register", need_help_data)
        if result["success"]:
            self.need_help_token = result["data"]["access_token"]
            self.need_help_user_id = result["data"]["user_id"]
            self.log_test("Register Need Help User", True, f"User ID: {self.need_help_user_id}")
        else:
            self.log_test("Register Need Help User", False, f"Status: {result['status_code']}, Data: {result['data']}")
        
        # Test 3: Login with email
        login_data = {
            "email": f"sarah.helper.{unique_id}@example.com",
            "password": "SecurePass123!"
        }
        
        result = self.make_request("POST", "/auth/login", login_data)
        success = result["success"] and result["data"].get("access_token") is not None
        self.log_test("Login with Email", success, f"Token received: {bool(result['data'].get('access_token'))}")
        
        # Test 4: Get current user info
        if self.helper_token:
            result = self.make_request("GET", "/auth/me", token=self.helper_token)
            success = result["success"] and result["data"].get("name") == "Sarah Wilson"
            self.log_test("Get Current User Info", success, f"Name: {result['data'].get('name')}")
        else:
            self.log_test("Get Current User Info", False, "No token available")
    
    def test_user_management(self):
        """Test user management APIs"""
        print("=== TESTING USER MANAGEMENT APIS ===\n")
        
        # Test 1: Get user by ID
        if self.helper_user_id:
            result = self.make_request("GET", f"/users/{self.helper_user_id}")
            success = result["success"] and result["data"].get("name") == "Sarah Wilson"
            self.log_test("Get User by ID", success, f"Retrieved user: {result['data'].get('name')}")
        else:
            self.log_test("Get User by ID", False, "No user ID available")
        
        # Test 2: Update user profile
        if self.helper_token:
            update_data = {
                "location": {
                    "lat": 40.7128,
                    "lng": -74.0060,
                    "address": "New York, NY"
                },
                "profile_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ..."
            }
            
            result = self.make_request("PUT", "/users/me", update_data, self.helper_token)
            success = result["success"] and result["data"].get("location") is not None
            details = f"Location updated: {bool(result['data'].get('location'))} | Status: {result['status_code']} | Response: {str(result['data'])[:200]}"
            self.log_test("Update User Profile", success, details)
        else:
            self.log_test("Update User Profile", False, "No token available")
    
    def test_helper_marketplace(self):
        """Test helper marketplace API"""
        print("=== TESTING HELPER MARKETPLACE API ===\n")
        
        # Test 1: Get all helpers
        if self.need_help_token:
            result = self.make_request("GET", "/helpers", token=self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            helper_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get All Helpers", success, f"Found {helper_count} helpers")
        else:
            self.log_test("Get All Helpers", False, "No token available")
        
        # Test 2: Filter helpers by category
        if self.need_help_token:
            params = {"category": "plumbing"}
            result = self.make_request("GET", "/helpers", params, self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            helper_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Filter Helpers by Category", success, f"Found {helper_count} plumbing helpers")
        else:
            self.log_test("Filter Helpers by Category", False, "No token available")
        
        # Test 3: Get helpers with distance calculation
        if self.need_help_token:
            params = {"lat": 40.7589, "lng": -73.9851}  # Times Square coordinates
            result = self.make_request("GET", "/helpers", params, self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            has_distance = any(helper.get("distance") is not None for helper in result["data"]) if isinstance(result["data"], list) else False
            self.log_test("Get Helpers with Distance", success, f"Distance calculated: {has_distance}")
        else:
            self.log_test("Get Helpers with Distance", False, "No token available")
    
    def test_job_management(self):
        """Test job management APIs"""
        print("=== TESTING JOB MANAGEMENT APIS ===\n")
        
        # Test 1: Create job
        if self.need_help_token:
            job_data = {
                "title": "Fix Kitchen Sink Plumbing",
                "description": "Kitchen sink is leaking and needs urgent repair. The pipe under the sink appears to be loose.",
                "budget": 150.0,
                "category": "plumbing",
                "location": {
                    "lat": 40.7589,
                    "lng": -73.9851,
                    "address": "Times Square, New York, NY"
                }
            }
            
            result = self.make_request("POST", "/jobs", job_data, self.need_help_token)
            if result["success"]:
                self.job_id = result["data"]["_id"]
                self.log_test("Create Job", True, f"Job ID: {self.job_id}")
            else:
                self.log_test("Create Job", False, f"Status: {result['status_code']}, Data: {result['data']}")
        else:
            self.log_test("Create Job", False, "No token available")
        
        # Test 2: Get all jobs
        if self.helper_token:
            result = self.make_request("GET", "/jobs", token=self.helper_token)
            success = result["success"] and isinstance(result["data"], list)
            job_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get All Jobs", success, f"Found {job_count} jobs")
        else:
            self.log_test("Get All Jobs", False, "No token available")
        
        # Test 3: Get job by ID
        if self.job_id and self.helper_token:
            result = self.make_request("GET", f"/jobs/{self.job_id}", token=self.helper_token)
            success = result["success"] and result["data"].get("title") == "Fix Kitchen Sink Plumbing"
            self.log_test("Get Job by ID", success, f"Title: {result['data'].get('title')}")
        else:
            self.log_test("Get Job by ID", False, "No job ID or token available")
        
        # Test 4: Accept job (helper accepts job)
        if self.job_id and self.helper_token:
            result = self.make_request("PUT", f"/jobs/{self.job_id}/accept", token=self.helper_token)
            success = result["success"] and result["data"].get("status") == "accepted"
            self.log_test("Accept Job", success, f"Status: {result['data'].get('status')}")
        else:
            self.log_test("Accept Job", False, "No job ID or token available")
        
        # Test 5: Update job status to in_progress
        if self.job_id and self.helper_token:
            status_data = {"status": "in_progress"}
            result = self.make_request("PUT", f"/jobs/{self.job_id}/status", status_data, self.helper_token)
            success = result["success"] and result["data"].get("status") == "in_progress"
            self.log_test("Update Job Status to In Progress", success, f"Status: {result['data'].get('status')}")
        else:
            self.log_test("Update Job Status to In Progress", False, "No job ID or token available")
        
        # Test 6: Get my posted jobs
        if self.need_help_token:
            result = self.make_request("GET", "/jobs/my/posted", token=self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            job_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get My Posted Jobs", success, f"Found {job_count} posted jobs")
        else:
            self.log_test("Get My Posted Jobs", False, "No token available")
        
        # Test 7: Get my accepted jobs
        if self.helper_token:
            result = self.make_request("GET", "/jobs/my/accepted", token=self.helper_token)
            success = result["success"] and isinstance(result["data"], list)
            job_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get My Accepted Jobs", success, f"Found {job_count} accepted jobs")
        else:
            self.log_test("Get My Accepted Jobs", False, "No token available")
        
        # Test 8: Complete job
        if self.job_id and self.helper_token:
            status_data = {"status": "completed"}
            result = self.make_request("PUT", f"/jobs/{self.job_id}/status", status_data, self.helper_token)
            success = result["success"] and result["data"].get("status") == "completed"
            self.log_test("Complete Job", success, f"Status: {result['data'].get('status')}")
        else:
            self.log_test("Complete Job", False, "No job ID or token available")
    
    def test_messaging(self):
        """Test messaging APIs"""
        print("=== TESTING MESSAGING APIS ===\n")
        
        # Test 1: Send message from need_help user to helper
        if self.job_id and self.need_help_token and self.helper_user_id:
            message_data = {
                "job_id": self.job_id,
                "receiver_id": self.helper_user_id,
                "message": "Hi! When can you start working on the sink repair?"
            }
            
            result = self.make_request("POST", "/messages", message_data, self.need_help_token)
            success = result["success"] and result["data"].get("message") is not None
            self.log_test("Send Message (Customer to Helper)", success, f"Message: {result['data'].get('message')}")
        else:
            self.log_test("Send Message (Customer to Helper)", False, "Missing job ID, token, or user ID")
        
        # Test 2: Send reply from helper to need_help user
        if self.job_id and self.helper_token and self.need_help_user_id:
            message_data = {
                "job_id": self.job_id,
                "receiver_id": self.need_help_user_id,
                "message": "Hello! I can start tomorrow morning at 9 AM. Does that work for you?"
            }
            
            result = self.make_request("POST", "/messages", message_data, self.helper_token)
            success = result["success"] and result["data"].get("message") is not None
            self.log_test("Send Message (Helper to Customer)", success, f"Message: {result['data'].get('message')}")
        else:
            self.log_test("Send Message (Helper to Customer)", False, "Missing job ID, token, or user ID")
        
        # Test 3: Get job messages
        if self.job_id and self.need_help_token:
            result = self.make_request("GET", f"/messages/jobs/{self.job_id}", token=self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            message_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get Job Messages", success, f"Found {message_count} messages")
        else:
            self.log_test("Get Job Messages", False, "No job ID or token available")
        
        # Test 4: Get conversations
        if self.need_help_token:
            result = self.make_request("GET", "/messages/conversations", token=self.need_help_token)
            success = result["success"] and isinstance(result["data"], list)
            conv_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get Conversations", success, f"Found {conv_count} conversations")
        else:
            self.log_test("Get Conversations", False, "No token available")
    
    def test_reviews(self):
        """Test reviews and ratings API"""
        print("=== TESTING REVIEWS AND RATINGS API ===\n")
        
        # Test 1: Create review
        if self.job_id and self.need_help_token and self.helper_user_id:
            review_data = {
                "job_id": self.job_id,
                "helper_id": self.helper_user_id,
                "rating": 5,
                "comment": "Excellent work! Sarah fixed the sink quickly and professionally. Highly recommend!"
            }
            
            result = self.make_request("POST", "/reviews", review_data, self.need_help_token)
            success = result["success"] and result["data"].get("message") is not None
            self.log_test("Create Review", success, f"Response: {result['data'].get('message', result['data'])}")
        else:
            self.log_test("Create Review", False, "Missing job ID, token, or helper ID")
        
        # Test 2: Get helper reviews
        if self.helper_user_id:
            result = self.make_request("GET", f"/reviews/helper/{self.helper_user_id}")
            success = result["success"] and isinstance(result["data"], list)
            review_count = len(result["data"]) if isinstance(result["data"], list) else 0
            self.log_test("Get Helper Reviews", success, f"Found {review_count} reviews")
        else:
            self.log_test("Get Helper Reviews", False, "No helper user ID available")
        
        # Test 3: Verify helper rating updated
        if self.helper_user_id:
            result = self.make_request("GET", f"/users/{self.helper_user_id}")
            success = result["success"] and result["data"].get("rating", 0) > 0
            rating = result["data"].get("rating", 0) if result["success"] else 0
            self.log_test("Verify Helper Rating Updated", success, f"New rating: {rating}")
        else:
            self.log_test("Verify Helper Rating Updated", False, "No helper user ID available")
    
    def test_distance_calculation(self):
        """Test distance calculation functionality"""
        print("=== TESTING DISTANCE CALCULATION ===\n")
        
        # Test distance calculation with jobs
        if self.need_help_token:
            params = {"lat": 40.7589, "lng": -73.9851}  # Times Square
            result = self.make_request("GET", "/jobs", params, self.need_help_token)
            
            if result["success"] and isinstance(result["data"], list):
                has_distance = any(job.get("distance") is not None for job in result["data"])
                distances = [job.get("distance") for job in result["data"] if job.get("distance") is not None]
                self.log_test("Distance Calculation for Jobs", has_distance, 
                            f"Distances found: {distances[:3] if distances else 'None'}")
            else:
                self.log_test("Distance Calculation for Jobs", False, "Failed to get jobs")
        else:
            self.log_test("Distance Calculation for Jobs", False, "No token available")
    
    def print_summary(self):
        """Print test summary"""
        print("=" * 50)
        print("BACKEND API TEST SUMMARY")
        print("=" * 50)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        print()
        
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"❌ {result['test']}: {result['details']}")
            print()
        
        print("CRITICAL ISSUES TO ADDRESS:")
        critical_failures = []
        for result in self.test_results:
            if not result["success"]:
                if any(keyword in result["test"].lower() for keyword in ["register", "login", "create job", "accept job"]):
                    critical_failures.append(result["test"])
        
        if critical_failures:
            for failure in critical_failures:
                print(f"🔥 {failure}")
        else:
            print("✅ No critical issues found!")
        
        return passed_tests, failed_tests
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting SolveConnect Backend API Tests...\n")
        print(f"Base URL: {self.base_url}\n")
        
        try:
            self.test_authentication()
            self.test_user_management()
            self.test_helper_marketplace()
            self.test_job_management()
            self.test_messaging()
            self.test_reviews()
            self.test_distance_calculation()
            
            passed, failed = self.print_summary()
            return passed, failed
            
        except Exception as e:
            print(f"❌ CRITICAL ERROR: {str(e)}")
            return 0, len(self.test_results) + 1

def main():
    """Main function to run all tests"""
    tester = SolveConnectTester()
    passed, failed = tester.run_all_tests()
    
    # Exit with appropriate code
    sys.exit(0 if failed == 0 else 1)

if __name__ == "__main__":
    main()