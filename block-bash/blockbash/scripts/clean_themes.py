#!/usr/bin/env python3

import re

def clean_css_file(input_file, output_file):
    with open(input_file, 'r') as f:
        content = f.read()
    
    # Remove all neon theme rules
    content = re.sub(r'\[data-theme="neon"\][^{]*\{[^}]*\}', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Remove all classic theme rules  
    content = re.sub(r'\[data-theme="classic"\][^{]*\{[^}]*\}', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Remove all invert theme rules
    content = re.sub(r'\[data-theme="invert"\][^{]*\{[^}]*\}', '', content, flags=re.MULTILINE | re.DOTALL)
    
    # Remove empty lines
    content = re.sub(r'\n\s*\n\s*\n', '\n\n', content)
    
    with open(output_file, 'w') as f:
        f.write(content)

if __name__ == "__main__":
    clean_css_file('public/css/general.css', 'public/css/general_cleaned.css')
    print("CSS cleaned successfully!")
