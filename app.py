import os
from flask import Flask, render_template, request, jsonify, redirect, flash
import requests
from utils import validate_email_domain, parse_file_contents
from werkzeug.utils import secure_filename

app = Flask(__name__)
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev_key_12345")
SMARTLEAD_API_KEY = os.environ.get("SMARTLEAD_API_KEY")

@app.route('/')
def index():
    return render_template('form.html')

@app.route('/verify-email', methods=['POST'])
def verify_email():
    platform_email = request.form.get('platform_email')
    
    if not platform_email:
        return jsonify({
            'success': False,
            'error': 'Email is required',
            'status': 'validation_error'
        })
    
    if not validate_email_domain(platform_email):
        return jsonify({
            'success': False,
            'error': 'Invalid email format',
            'status': 'validation_error'
        })
    
    try:
        response = requests.get(
            'https://server.smartlead.ai/api/v1/client/',
            params={'api_key': SMARTLEAD_API_KEY}
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
            return jsonify({
                'success': False,
                'error': 'Email not found in Smartlead system',
                'status': 'not_found'
            })
        
        return jsonify({
            'success': True,
            'client_id': client_id,
            'message': f'Welcome back, {client_name}! You can now upload your DNC list.',
            'status': 'verified'
        })
        
    except requests.exceptions.RequestException as e:
        return jsonify({
            'success': False,
            'error': 'Unable to verify email with Smartlead. Please try again later.',
            'status': 'api_error'
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'An unexpected error occurred',
            'status': 'system_error'
        })

@app.route('/submit-blocklist', methods=['POST'])
def submit_blocklist():
    client_id = request.form.get('client_id')
    upload_type = request.form.get('upload_type')
    
    try:
        block_list = []
        
        if upload_type == 'file':
            file = request.files.get('file')
            if not file:
                return jsonify({'success': False, 'error': 'No file provided'})
                
            filename = secure_filename(file.filename)
            content = file.read().decode('utf-8')
            block_list = parse_file_contents(content)
            
        else:  # single entry
            entry = request.form.get('single_entry')
            if not validate_email_domain(entry):
                return jsonify({'success': False, 'error': 'Invalid email or domain format'})
            block_list = [entry]
            
        # Submit to Smartlead API
        response = requests.post(
            'https://server.smartlead.ai/api/v1/leads/add-domain-block-list',
            params={'api_key': SMARTLEAD_API_KEY},
            json={
                'domain_block_list': block_list,
                'client_id': client_id
            }
        )
        response.raise_for_status()
        
        return jsonify({'success': True, 'redirect_url': 'https://leadbird.io'})
        
    except requests.exceptions.RequestException as e:
        return jsonify({'success': False, 'error': 'Failed to submit block list to Smartlead'})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)})
