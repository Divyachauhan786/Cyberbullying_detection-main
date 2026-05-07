import pandas as pd
import pickle
from sklearn.model_selection import train_test_split
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
from preprocessing import clean_text
df = pd.read_csv("dataset/cyberbullying_tweets.csv")


df["tweet_text"] = df["tweet_text"].apply(clean_text)


X = df["tweet_text"]
y = df["cyberbullying_type"]


vectorizer = TfidfVectorizer(max_features=7000)
X_vec = vectorizer.fit_transform(X)


X_train, X_test, y_train, y_test = train_test_split(
    X_vec, y, test_size=0.2, random_state=42, stratify=y
)

model = LogisticRegression(max_iter=1000)
model.fit(X_train, y_train)

y_pred = model.predict(X_test)
print("Accuracy:", accuracy_score(y_test, y_pred))

pickle.dump(model, open("models/model.pkl", "wb"))
pickle.dump(vectorizer, open("models/vectorizer.pkl", "wb"))
import pickle
import os

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
model_path = os.path.join(BASE_DIR, "models")

os.makedirs(model_path, exist_ok=True)

pickle.dump(model, open(os.path.join(model_path, "model.pkl"), "wb"))
pickle.dump(vectorizer, open(os.path.join(model_path, "vectorizer.pkl"), "wb"))

print(" Model & Vectorizer saved")

