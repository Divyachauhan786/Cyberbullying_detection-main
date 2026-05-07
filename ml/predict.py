import pickle
import os

# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

model_path = os.path.join(BASE_DIR, "models", "model.pkl")
vectorizer_path = os.path.join(BASE_DIR, "models", "vectorizer.pkl")

# Load model
with open(model_path, "rb") as f:
    model = pickle.load(f)

# Load vectorizer
with open(vectorizer_path, "rb") as f:
    vectorizer = pickle.load(f)


def predict_text(text):
    try:
        text_vector = vectorizer.transform([text])
        prediction = model.predict(text_vector)

        
        return str(prediction[0]).lower().strip().replace("_", " ")

    except Exception as e:
        print("Prediction error:", e)
        return "not cyberbullying"