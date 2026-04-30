from flask import Blueprint, request, jsonify, render_template
from ml.predict import predict_text

main = Blueprint("main", __name__)

@main.route("/")
def home():
    return render_template("index.html")

@main.route("/predict", methods=["POST"])
def predict():
    try:
        data = request.get_json()
        text = data.get("text", "")

        print("📩 Text received:", text)

        prediction = predict_text(text)

        print("✅ Prediction:", prediction)

        return jsonify({
            "prediction": int(prediction)
            "confidence" = round(float(np.max(probs)), 4)
        })

    except Exception as e:
        print("❌ ERROR:", str(e))
        return jsonify({
            "error": str(e)
        }), 500
