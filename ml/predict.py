import pickle
import numpy as np
from ml.preprocessing import clean_text

model = pickle.load(open("models/model.pkl", "rb"))
vectorizer = pickle.load(open("models/vectorizer.pkl", "rb"))


def predict_text(text):
    cleaned = clean_text(text)
    vector = vectorizer.transform([cleaned])

    # Prediction label
    prediction = model.predict(vector)[0]

    # Confidence (if model supports predict_proba)
    if hasattr(model, "predict_proba"):
        probs = model.predict_proba(vector)[0]
        confidence = float(np.max(probs))
    else:
        confidence = None

    return prediction, confidence
