from flask import Flask, request, jsonify, render_template
from ml.predict import predict_text

app = Flask(__name__)

# Cyberbullying labels
BULLYING_LABELS = [
    "other_cyberbullying",
    "sexual_harassment",
    "threat",
    "religious_hate",
    "gender_hate"
]

@app.route("/")
def home():
    return render_template("index.html")

@app.route("/analyze", methods=["POST"])
def analyze():
    data = request.get_json()
    text = data.get("text")

    prediction, confidence = predict_text(text)
    print(f"DEBUG >>> prediction='{prediction}' confidence={confidence}")
    prediction = str(prediction).lower().strip().replace("_", " ")

    return jsonify({
        "prediction": prediction,
        "confidence": confidence
    })

if __name__ == "__main__":
    app.run(debug=True)
