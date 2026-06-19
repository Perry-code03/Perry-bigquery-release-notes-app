import urllib.request
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template

app = Flask(__name__)

FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"

def fetch_and_parse_feed():
    # Use a standard browser User-Agent to avoid potential blocks
    req = urllib.request.Request(
        FEED_URL, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    with urllib.request.urlopen(req, timeout=15) as response:
        xml_data = response.read()
    
    root = ET.fromstring(xml_data)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    entries = []
    for entry in root.findall('atom:entry', ns):
        title = entry.find('atom:title', ns)
        id_val = entry.find('atom:id', ns)
        updated = entry.find('atom:updated', ns)
        content = entry.find('atom:content', ns)
        
        # Find the alternate link, fallback to any link
        link_el = entry.find("atom:link[@rel='alternate']", ns)
        if link_el is None:
            link_el = entry.find("atom:link", ns)
        link = link_el.attrib.get('href', '') if link_el is not None else ''
        
        entries.append({
            'title': title.text if title is not None else '',
            'id': id_val.text if id_val is not None else '',
            'updated': updated.text if updated is not None else '',
            'link': link,
            'content': content.text if content is not None else ''
        })
        
    return entries

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/notes')
def get_notes():
    try:
        notes = fetch_and_parse_feed()
        return jsonify({
            'success': True,
            'data': notes
        })
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

if __name__ == '__main__':
    app.run(debug=True, port=5000)
