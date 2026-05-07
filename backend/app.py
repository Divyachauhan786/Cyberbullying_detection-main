from flask import Flask, request, jsonify, render_template
from ml.predict import predict_text
from backend.youtube_utils import get_comments

app = Flask(__name__)

# Cyberbullying labels
BULLYING_LABELS = [
    "other cyberbullying",
    "sexual harassment",
    "threat",
    "religious hate",
    "gender hate"
]

@app.route("/")
def home():
    return render_template("index.html")


#  Single text analyzer
@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    text = data.get("text")

    prediction = predict_text(text)

    return jsonify({
        "prediction": prediction,
        "confidence": 1.0  
    })


@app.route('/analyze_youtube', methods=['POST'])
def analyze_youtube():
    data = request.get_json()
    url = data.get("url")

    comments = get_comments(url)

    if not comments:
        return jsonify({
            "error": " Comments not available for this video"
        }), 400

    results = []
    bullying_count = 0

    for c in comments:
        prediction = predict_text(c["comment"])

        is_bullying = prediction != "not cyberbullying"

        if is_bullying:
            bullying_count += 1

        results.append({
            "author": c["author"],
            "text": c["comment"],
            "prediction": str(prediction),
            "confidence": 0.9,
            "is_harmful": is_bullying
        })

    return jsonify({
        "video": {
            "title": "YouTube Video",
            "channel": "Unknown",
            "thumbnail": None
        },
        "summary": {
            "total": len(comments),
            "flagged": bullying_count,
            "safe": len(comments) - bullying_count,
            "flagged_pct": round((bullying_count/len(comments))*100, 2)
        },
        "comments": results
    })

if __name__ == "__main__":
    app.run(debug=True)