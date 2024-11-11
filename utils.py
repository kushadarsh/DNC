import re

def validate_email_domain(value):
    """Validate email or domain format"""
    # Email regex pattern
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    # Domain regex pattern
    domain_pattern = r'^[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\.[a-zA-Z]{2,}$'
    
    return bool(re.match(email_pattern, value) or re.match(domain_pattern, value))

def parse_file_contents(content):
    """Parse file contents and validate entries"""
    lines = content.split('\n')
    valid_entries = []
    
    for line in lines:
        line = line.strip()
        if line and validate_email_domain(line):
            valid_entries.append(line)
            
    return valid_entries
