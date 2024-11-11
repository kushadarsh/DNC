import os
import logging
from flask import Flask, render_template, request, jsonify
import requests
from utils import validate_email_domain, parse_file_contents
from werkzeug.utils import secure_filename

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev_key_12345")
SMARTLEAD_API_KEY = os.environ.get("SMARTLEAD_API_KEY")

# CORS headers
@app.after_request
def after_request(response):
    response.headers.add('Access-Control-Allow-Origin', '*')
    response.headers.add('Access-Control-Allow-Headers', 'Content-Type')
    response.headers.add('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
    return response

@app.route('/')
def index():
    return render_template('form.html')

@app.route('/submit-blocklist', methods=['POST'])
def submit_blocklist():
    platform_email = request.form.get('platform_email')
    upload_type = request.form.get('upload_type')
    logger.info(f"Processing blocklist submission for email: {platform_email}")
    
    try:
        # Get client information
        logger.info("Making request to Smartlead API")
        response = requests.get(
            'https://server.smartlead.ai/api/v1/client/',
            params={'api_key': SMARTLEAD_API_KEY},
            timeout=10
        )
        response.raise_for_status()
        
        # Find matching client
        clients = response.json()
        client_id = None
        
        for client in clients:
            if client.get('email') == platform_email:
                client_id = client.get('id')
                break
        
        if not client_id:
            return jsonify({
                'success': False,
                'error': 'Email not found',
                'details': 'The provided email is not registered in our system'
            })

        block_list = []
        
        if upload_type == 'file':
            file = request.files.get('file')
            if not file:
                logger.warning("No file provided in blocklist submission")
                return jsonify({
                    'success': False,
                    'error': 'No file provided',
                    'details': 'Please select a file to upload'
                })
                
            filename = secure_filename(file.filename or '')
            if not filename:
                return jsonify({
                    'success': False,
                    'error': 'Invalid filename',
                    'details': 'The provided file has an invalid name'
                })
                
            content = file.read().decode('utf-8')
            block_list = parse_file_contents(content)
            
        else:  # single entry
            entry = request.form.get('single_entry')
            if not validate_email_domain(entry):
                logger.warning(f"Invalid entry format: {entry}")
                return jsonify({
                    'success': False,
                    'error': 'Invalid format',
                    'details': 'Please enter a valid email or domain'
                })
            block_list = [entry]
            
        logger.info(f"Submitting {len(block_list)} entries to Smartlead")
        response = requests.post(
            'https://server.smartlead.ai/api/v1/leads/add-domain-block-list',
            params={'api_key': SMARTLEAD_API_KEY},
            json={
                'domain_block_list': block_list,
                'client_id': client_id
            },
            timeout=15
        )
        response.raise_for_status()
        
        logger.info("Successfully submitted blocklist")
        return jsonify({
            'success': True,
            'redirect_url': 'https://leadbird.io',
            'message': 'Your DNC list has been successfully uploaded'
        })
        
    except requests.exceptions.Timeout:
        logger.error("Timeout while submitting blocklist")
        return jsonify({
            'success': False,
            'error': 'Connection timeout',
            'details': 'The server is taking too long to respond'
        })
    except requests.exceptions.RequestException as e:
        logger.error(f"API error while submitting blocklist: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Failed to submit block list',
            'details': 'Unable to process your request at this time'
        })
    except Exception as e:
        logger.error(f"Unexpected error in blocklist submission: {str(e)}")
        return jsonify({
            'success': False,
            'error': str(e),
            'details': 'An unexpected error occurred'
        })
