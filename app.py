import os
import logging
from flask import Flask, render_template, request, jsonify, redirect, flash
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

@app.route('/verify-email', methods=['POST'])
def verify_email():
    platform_email = request.form.get('platform_email')
    logger.info(f"Verifying email: {platform_email}")
    
    if not platform_email:
        logger.warning("Email verification failed: No email provided")
        return jsonify({
            'success': False,
            'error': 'Email is required',
            'status': 'validation_error',
            'details': 'Please provide an email address'
        })
    
    if not validate_email_domain(platform_email):
        logger.warning(f"Email validation failed for: {platform_email}")
        return jsonify({
            'success': False,
            'error': 'Invalid email format',
            'status': 'validation_error',
            'details': 'Please enter a valid email address'
        })
    
    try:
        logger.info("Making request to Smartlead API")
        response = requests.get(
            'https://server.smartlead.ai/api/v1/client/',
            params={'api_key': SMARTLEAD_API_KEY},
            timeout=10  # Add timeout
        )
        response.raise_for_status()
        
        # Find matching client
        clients = response.json()
        client_id = None
        client_name = None
        
        for client in clients:
            if client.get('email') == platform_email:
                client_id = client.get('id')
                client_name = client.get('name', 'User')
                break
        
        if not client_id:
            logger.warning(f"Client not found for email: {platform_email}")
            return jsonify({
                'success': False,
                'error': 'Email not found in Smartlead system',
                'status': 'not_found',
                'details': 'The provided email is not registered in our system'
            })
        
        logger.info(f"Successfully verified email for client: {client_id}")
        return jsonify({
            'success': True,
            'client_id': client_id,
            'message': f'Welcome back, {client_name}! You can now upload your DNC list.',
            'status': 'verified',
            'details': 'Email verification successful'
        })
        
    except requests.exceptions.Timeout:
        logger.error("Smartlead API timeout")
        return jsonify({
            'success': False,
            'error': 'Connection timeout',
            'status': 'timeout_error',
            'details': 'The server is taking too long to respond. Please try again.'
        })
    except requests.exceptions.RequestException as e:
        logger.error(f"Smartlead API error: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'Unable to verify email with Smartlead',
            'status': 'api_error',
            'details': 'Our verification service is temporarily unavailable'
        })
    except Exception as e:
        logger.error(f"Unexpected error during email verification: {str(e)}")
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred',
            'status': 'system_error',
            'details': 'Please try again later'
        })

@app.route('/submit-blocklist', methods=['POST'])
def submit_blocklist():
    client_id = request.form.get('client_id')
    upload_type = request.form.get('upload_type')
    logger.info(f"Processing blocklist submission for client: {client_id}")
    
    try:
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
