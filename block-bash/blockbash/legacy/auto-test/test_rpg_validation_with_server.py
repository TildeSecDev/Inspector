#!/usr/bin/env python3
"""
Selenium end-to-end test for Inspector RPG validation workflow
This script will:
1. Start the Inspector server (node app.js)
2. Wait for the server to be ready
3. Run the Selenium test
4. Stop the server after the test
"""
import subprocess
import time
import unittest
import signal
import sys
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.action_chains import ActionChains

SERVER_CMD = ["node", "app.js"]
SERVER_URL = "http://localhost:3000"
SERVER_START_TIMEOUT = 30

class InspectorRPGValidationTest(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Start the server
        cls.server_proc = subprocess.Popen(SERVER_CMD, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        # Wait for server to be ready
        for _ in range(SERVER_START_TIMEOUT):
            try:
                import urllib.request
                with urllib.request.urlopen(SERVER_URL) as resp:
                    if resp.status == 200:
                        break
            except Exception:
                time.sleep(1)
        else:
            cls.server_proc.terminate()
            raise RuntimeError("Server did not start in time")

    @classmethod
    def tearDownClass(cls):
        # Stop the server
        if cls.server_proc:
            cls.server_proc.terminate()
            try:
                cls.server_proc.wait(timeout=5)
            except subprocess.TimeoutExpired:
                cls.server_proc.kill()

    def setUp(self):
        from selenium.webdriver.chrome.options import Options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.get(SERVER_URL)
        self.wait = WebDriverWait(self.driver, 20)
        driver = self.driver
        wait = self.wait
        # Try to login if login form is present
        try:
            login_input = wait.until(EC.presence_of_element_located((By.XPATH, "//input[@placeholder='Email or Username']")))
            password_input = driver.find_element(By.XPATH, "//input[@placeholder='Password']")
            login_button = driver.find_element(By.XPATH, "//button[contains(., 'LOGIN')]")
            login_input.clear()
            login_input.send_keys('test@test.com')
            password_input.clear()
            password_input.send_keys('test')
            login_button.click()
            # Wait for redirect to /editor or terminal to appear
            wait.until(lambda d: '/editor' in d.current_url or d.find_elements(By.ID, 'output-terminal'))
            if '/editor' not in driver.current_url:
                driver.get(SERVER_URL + '/editor')
        except Exception:
            # If login not required or already logged in, try /editor directly
            driver.get(SERVER_URL + '/editor')
            wait.until(EC.presence_of_element_located((By.ID, 'output-terminal')))

    def tearDown(self):
        self.driver.quit()

    def test_rpg_validation_workflow(self):
        driver = self.driver
        wait = WebDriverWait(driver, 40)  # Increase timeout
        term = wait.until(EC.presence_of_element_located((By.ID, 'output-terminal')))
        # Try to find the RPG activity window by several selectors
        activity_window = None
        try:
            activity_window = wait.until(EC.presence_of_element_located((By.ID, 'workshop-container')))
        except Exception:
            print('Could not find #workshop-container. Printing full HTML for debug:')
            print(driver.page_source)
            raise
        time.sleep(2)
        import os
        if os.environ.get('INSPECTOR_XTERM_TEST_MODE') == '1':
            js_inject = (
                "if (window.term) { window.term.focus(); window.term.paste('ls\\n'); }"
            )
            driver.execute_script(js_inject)
            time.sleep(1)
        else:
            term.click()
            actions = ActionChains(driver)
            actions.send_keys('ls').send_keys(Keys.RETURN).perform()
            time.sleep(1)
        def get_terminal_text(driver):
            js = (
                "var buf = window.term && window.term.buffer && window.term.buffer.active;"
                "var out = '';"
                "if (buf && buf.length) {"
                "  for (var i = 0; i < buf.length; i++) {"
                "    var line = buf.getLine(i);"
                "    if (line) out += line.translateToString() + '\\n';"
                "  }"
                "}"
                "return out;"
            )
            return driver.execute_script(js)
        def menu_in_terminal(driver):
            text = get_terminal_text(driver)
            if '--- MENU ---' not in text:
                print('DEBUG TERMINAL BUFFER (menu not found):')
                print(text)
            return '--- MENU ---' in text
        try:
            wait.until(menu_in_terminal)
        except Exception as e:
            print('FAILED TO FIND MENU IN TERMINAL BUFFER:')
            print(get_terminal_text(driver))
            print('Printing full HTML for debug:')
            print(driver.page_source)
            raise
        # Check workshop container text for menu
        activity_text = activity_window.text
        print('DEBUG: Workshop container text:')
        print(activity_text)
        # Accept either the visible menu heading or any menu button label
        found_menu = (
            '--- MENU ---' in activity_text or
            'Start' in activity_text or
            'Options' in activity_text or
            'Progress' in activity_text
        )
        self.assertTrue(found_menu, f"Expected menu heading or button label in activity window, got: {activity_text}")
        # --- Ensure activity is set to 'rpg' for validation (send to backend via WebSocket and wait for ack) ---
        driver.execute_script('''
            window._inspector_activity_set = false;
            function _inspector_activity_ack(event) {
                try {
                    var json = JSON.parse(event.data);
                    if (json.type === 'activity-set' && json.activity === 'rpg') {
                        window._inspector_activity_set = true;
                    }
                } catch (e) {}
            }
            if (window.term && window.term._core && window.term._core._socket) {
                window.term._core._socket.addEventListener('message', _inspector_activity_ack);
                window.term._core._socket.send(JSON.stringify({type: 'set-activity', activity: 'rpg'}));
            } else if (window.term && window.term._core && window.term._core._ws) {
                window.term._core._ws.addEventListener('message', _inspector_activity_ack);
                window.term._core._ws.send(JSON.stringify({type: 'set-activity', activity: 'rpg'}));
            } else if (window.term && window.term._socket) {
                window.term._socket.addEventListener('message', _inspector_activity_ack);
                window.term._socket.send(JSON.stringify({type: 'set-activity', activity: 'rpg'}));
            }
        ''')
        # Wait for ack
        for _ in range(20):
            if driver.execute_script('return window._inspector_activity_set === true;'):
                break
            time.sleep(0.2)
        else:
            raise RuntimeError('Did not receive activity-set ack from backend')
        # For the echo test as well
        if os.environ.get('INSPECTOR_XTERM_TEST_MODE') == '1':
            js_inject = (
                "if (window.term) { window.term.focus(); window.term.paste('echo test\\n'); }"
            )
            driver.execute_script(js_inject)
            time.sleep(1)
        else:
            term.click()
            actions = ActionChains(driver)
            actions.send_keys('echo test').send_keys(Keys.RETURN).perform()
            time.sleep(1)
        def test_in_terminal(driver):
            return get_terminal_text(driver).find('test') != -1
        self.assertTrue(wait.until(test_in_terminal))

        # --- NEW: Test ping + Ctrl+C interruption and prompt/menu reactivity ---
        # 1. Run 'ping 1.1.1.1'
        if os.environ.get('INSPECTOR_XTERM_TEST_MODE') == '1':
            js_inject = ("if (window.term) { window.term.focus(); window.term.paste('ping 1.1.1.1\\n'); }")
            driver.execute_script(js_inject)
        else:
            term.click()
            actions = ActionChains(driver)
            actions.send_keys('ping 1.1.1.1').send_keys(Keys.RETURN).perform()
        # 2. Wait for ping output to appear
        def ping_in_terminal(driver):
            text = get_terminal_text(driver)
            return 'PING' in text or 'icmp_seq' in text or 'bytes from' in text
        self.assertTrue(wait.until(ping_in_terminal))
        # 3. Wait a bit for more output
        time.sleep(2)
        # 4. Send Ctrl+C
        if os.environ.get('INSPECTOR_XTERM_TEST_MODE') == '1':
            driver.execute_script("if (window.term) { window.term.focus(); window.term.paste(String.fromCharCode(3)); }")
        else:
            term.click()
            actions = ActionChains(driver)
            actions.send_keys(Keys.CONTROL, 'c').perform()
            # Fallback: send raw Ctrl+C if above doesn't work
            try:
                actions = ActionChains(driver)
                actions.send_keys('\u0003').perform()
            except Exception:
                pass
        # 5. Wait for prompt to reappear
        def prompt_in_terminal(driver):
            text = get_terminal_text(driver)
            # Look for a line ending with $ (prompt)
            return any(line.strip().endswith('$') for line in text.splitlines())
        self.assertTrue(wait.until(prompt_in_terminal))
        # 6. Check isRunning is false
        is_running = driver.execute_script('return window.isRunning === false;')
        self.assertTrue(is_running)
        # 7. Run 'ls' again and check for menu
        if os.environ.get('INSPECTOR_XTERM_TEST_MODE') == '1':
            driver.execute_script("if (window.term) { window.term.focus(); window.term.paste('ls\\n'); }")
        else:
            term.click()
            actions = ActionChains(driver)
            actions.send_keys('ls').send_keys(Keys.RETURN).perform()
        self.assertTrue(wait.until(menu_in_terminal))

if __name__ == '__main__':
    unittest.main()
