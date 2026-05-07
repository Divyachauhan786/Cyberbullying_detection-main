from flask import request, jsonify
from backend.youtube_utils import get_comments
from ml.predict import predict_text

@app.route('/analyze_youtube', methods=['POST'])
def analyze_youtube():
    data = request.get_json()
    url = data.get("url")

    comments = get_comments(url)

    results = []
    bullying_count = 0

    for c in comments:
        result = predict_text(c["comment"])

        if result == 1:
            bullying_count += 1

        results.append({
            "author": c["author"],
            "comment": c["comment"],
            "bullying": "Yes" if result == 1 else "No"
        })

    return jsonify({
        "total_comments": len(comments),
        "bullying_count": bullying_count,
        "results": results
    })