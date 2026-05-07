from backend.youtube_utils import get_comments
from ml.predict import predict_text

url = "https://www.youtube.com/watch?v=jNQXAC9IVRw"

comments = get_comments(url)

for c in comments[:10]:
    result = predict_text(c["comment"])

    print("User:", c["author"])
    print("Comment:", c["comment"])
    print("Bullying:", "Yes" if result == 1 else "No")
    print("-" * 50)