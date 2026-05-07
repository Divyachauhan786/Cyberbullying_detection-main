from youtube_comment_downloader import YoutubeCommentDownloader

def get_comments(video_url):
    try:
        downloader = YoutubeCommentDownloader()
        comments = []

        for comment in downloader.get_comments_from_url(video_url):
            comments.append({
                "author": comment.get('author', 'Unknown'),
                "comment": comment.get('text', '')
            })

            # limit to avoid crash
            if len(comments) >= 100:
                break

        if len(comments) == 0:
            raise Exception("No comments found (comments may be disabled)")

        return comments

    except Exception as e:
        print("YouTube Error:", e)
        return []