import re
import nltk
from nltk.corpus import stopwords

nltk.download("stopwords")

stop_words = set(stopwords.words("english"))

def clean_text(text):
    text = text.lower()                     # lowercase
    text = re.sub(r"http\S+", "", text)     # URLs remove
    text = re.sub(r"@\w+", "", text)        # mentions remove
    text = re.sub(r"#\w+", "", text)        # hashtags remove
    text = re.sub(r"[^a-z\s]", "", text)    # special chars remove
    words = text.split()
    words = [w for w in words if w not in stop_words]  # stopwords remove
    return " ".join(words)
