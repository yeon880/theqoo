import requests
from bs4 import BeautifulSoup
import telegram
import schedule
import time

# --- 설정 (이 부분을 수정해야 합니다) ---
# 텔레그램 봇 토큰 (BotFather에게 발급받은 토큰)
TELEGRAM_BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN"
# 텔레그램 챗 ID (알림을 받을 채팅방 ID)
TELEGRAM_CHAT_ID = "YOUR_TELEGRAM_CHAT_ID"
# 더쿠 게시판 URL
BOARD_URL = "https://theqoo.net/bl"
# 감시할 키워드 목록
KEYWORDS = ["도둑들", "밤식", "범식"]
# 스크래핑 주기 (분 단위)
SCRAPING_INTERVAL_MINUTES = 5

# 새로운 재시도 관련 설정
MAX_RETRIES = 3
RETRY_INTERVAL_SECONDS = 60

# 텔레그램 봇 초기화
bot = telegram.Bot(token=TELEGRAM_BOT_TOKEN)

# 마지막으로 확인한 게시글의 제목을 저장하기 위한 변수
# 중복 알림을 방지하기 위해 사용됩니다.
last_checked_title = ""

def get_latest_posts(url):
    """
    더쿠 게시판에서 최신 게시글 목록을 가져옵니다.
    """
    # User-Agent를 추가하여 봇이 아닌 것처럼 보이게 합니다.
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    }
    
    try:
        response = requests.get(url, headers=headers)
        response.raise_for_status() # HTTP 오류가 발생하면 예외를 일으킵니다.
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # 게시글 목록이 있는 테이블 찾기
        table = soup.find('table', class_='bd_lst')
        if not table:
            return []

        # 공지사항을 제외한 최신 게시글 행(<tr>) 찾기
        rows = table.find('tbody', class_='hide_notice').find_all('tr')
        
        posts = []
        for row in rows:
            # 제목과 링크가 포함된 <a> 태그 찾기
            title_tag = row.find('td', class_='title').find('a')
            if title_tag:
                title = title_tag.get_text(strip=True)
                link = "https://theqoo.net" + title_tag['href']
                posts.append({'title': title, 'link': link})
        return posts
    except requests.exceptions.RequestException as e:
        print(f"웹사이트에 접속하는 중 오류가 발생했습니다: {e}")
        return []

def send_telegram_message(message):
    """
    텔레그램으로 메시지를 보냅니다.
    """
    try:
        bot.send_message(chat_id=TELEGRAM_CHAT_ID, text=message)
        print("텔레그램 알림을 성공적으로 보냈습니다.")
    except telegram.error.TelegramError as e:
        print(f"텔레그램 메시지 전송 중 오류가 발생했습니다: {e}")

def check_for_new_posts():
    """
    새로운 게시글을 확인하고 키워드가 포함되면 알림을 보냅니다.
    """
    global last_checked_title
    print(f"{SCRAPING_INTERVAL_MINUTES}분마다 게시판을 확인합니다...")
    
    posts = get_latest_posts(BOARD_URL)
    if not posts:
        print("게시글을 가져올 수 없습니다.")
        return False # 실패를 알립니다.

    # 최신 게시글부터 확인하기 위해 리스트를 뒤집습니다.
    posts.reverse()
    
    new_posts = []
    # 마지막으로 확인한 게시글 이후의 새로운 게시글만 필터링합니다.
    start_index = 0
    if last_checked_title:
        try:
            # 이전에 확인한 게시글이 있는 위치를 찾습니다.
            start_index = [i for i, post in enumerate(posts) if post['title'] == last_checked_title][0] + 1
        except IndexError:
            # 이전에 확인한 게시글이 더 이상 목록에 없으면, 모든 게시글을 확인합니다.
            pass

    for post in posts[start_index:]:
        title = post['title']
        link = post['link']
        
        # 키워드 확인
        for keyword in KEYWORDS:
            if keyword in title:
                message = f"새로운 글 알림!\n\n제목: {title}\n링크: {link}"
                send_telegram_message(message)
                new_posts.append(post)
                break # 한 게시글에 여러 키워드가 있어도 한 번만 알림을 보냅니다.

    if new_posts:
        # 마지막으로 확인한 게시글 제목 업데이트
        last_checked_title = new_posts[-1]['title']
    elif posts:
        # 새로운 글이 없더라도 목록의 가장 최신 글을 저장하여 다음번 확인 시 중복을 방지합니다.
        last_checked_title = posts[-1]['title']
        
    return True # 성공을 알립니다.

def run_scraper():
    """
    스크래퍼를 실행하고 실패 시 재시도합니다.
    """
    retry_count = 0
    while retry_count < MAX_RETRIES:
        if check_for_new_posts():
            return # 성공 시 함수 종료
        
        print(f"스크래핑 실패. {RETRY_INTERVAL_SECONDS}초 후 재시도합니다... ({retry_count + 1}/{MAX_RETRIES})")
        time.sleep(RETRY_INTERVAL_SECONDS)
        retry_count += 1
    
    print("최대 재시도 횟수를 초과했습니다. 다음 예정된 시간에 다시 시도합니다.")


def main():
    """
    프로그램의 메인 함수입니다.
    """
    # 최초 실행
    print("최초 실행: 게시판을 확인합니다.")
    run_scraper()
    
    # 5분마다 run_scraper 함수 실행 예약
    schedule.every(SCRAPING_INTERVAL_MINUTES).minutes.do(run_scraper)
    
    print(f"프로그램이 {SCRAPING_INTERVAL_MINUTES}분마다 실행되도록 예약되었습니다.")
    while True:
        schedule.run_pending()
        time.sleep(1) # 1초마다 예약된 작업이 있는지 확인합니다.

if __name__ == "__main__":
    main()
