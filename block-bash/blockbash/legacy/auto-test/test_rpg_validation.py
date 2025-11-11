# Selenium end-to-end test for Inspector RPG validation workflow
# This test assumes the server is running and accessible at http://localhost:3000
# It will:
# 1. Open the Inspector app in a browser
# 2. Wait for the terminal to be ready
# 3. Type a command (e.g., 'ls') in the terminal
# 4. Wait for validation result in the terminal
# 5. Check that the RPG menu appears in the activity window
# 6. Ensure the terminal remains interactive

import time
import unittest
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC

class InspectorRPGValidationTest(unittest.TestCase):
    def setUp(self):
        from selenium.webdriver.chrome.options import Options
        chrome_options = Options()
        chrome_options.add_argument('--headless')
        chrome_options.add_argument('--no-sandbox')
        chrome_options.add_argument('--disable-dev-shm-usage')
        chrome_options.binary_location = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
        self.driver = webdriver.Chrome(options=chrome_options)
        self.driver.get('http://localhost:3000/editor')
        self.wait = WebDriverWait(self.driver, 20)

    def tearDown(self):
        self.driver.quit()

    def test_rpg_validation_workflow(self):
        driver = self.driver
        wait = self.wait

        # Wait for terminal to be ready
        term = wait.until(EC.presence_of_element_located((By.ID, 'output-terminal')))
        time.sleep(2)  # Let xterm.js initialize

        # Focus terminal and type 'ls' + Enter
        term.click()
        term.send_keys('ls')
        term.send_keys(Keys.RETURN)

        # Wait for validation result (look for '--- MENU ---' in terminal)
        def menu_in_terminal(driver):
            return '--- MENU ---' in term.text
        wait.until(menu_in_terminal)

        # Check RPG menu in activity window (assume #workshop-container)
        activity = wait.until(EC.presence_of_element_located((By.ID, 'workshop-container')))
        self.assertIn('MENU', activity.text)

        # Ensure terminal is still interactive (type 'echo test' and see output)
        term.send_keys('echo test')
        term.send_keys(Keys.RETURN)
        time.sleep(1)
        self.assertIn('test', term.text)

if __name__ == '__main__':
    unittest.main()
