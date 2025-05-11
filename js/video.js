// 페이지 로드 시 비디오 리스트 가져오기
getVideoList().then(createVideoItem);

// 현재 URL에서 videoId 추출
const currentURL = window.location.href;
const url = new URL(currentURL);
const videoId = url.searchParams.get("id");
const tagCache = {};

// API 호출 함수들
async function getVideoList() {
  const response = await fetch("https://www.techfree-oreumi-api.ai.kr/video/getVideoList");
  return response.json();
}

async function getVideoInfo(videoId) {
  const response = await fetch(`https://www.techfree-oreumi-api.ai.kr/video/getVideoInfo?video_id=${videoId}`);
  return response.json();
}

async function getChannelInfo(channelId) {
  const response = await fetch(`https://www.techfree-oreumi-api.ai.kr/channel/getChannelInfo?id=${encodeURIComponent(channelId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  return response.json();
}

// 태그간 유사도 확인
async function getSimilarity(firstWord, secondWord) {
  // const openApiURL = "http://aiopen.etri.re.kr:8000/WiseWWN/WordRel";
  const openApiURL = "https://www.techfree-oreumi-api.ai.kr/WiseWWN/WordRel";
  const requestJson = { argument: { first_word: firstWord, second_word: secondWord } };

  try {
    const response = await fetch(openApiURL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "84fc9029-2ecd-477e-9c8e-ffa929e32c2b",
        // Authorization: process.env.API_KEY,
      },
      body: JSON.stringify(requestJson),
    });
    const data = await response.json();

    // 정상 결과값이면 유사도값 반환
    if (data.result === -1 || !data.return_object) return 9999;
    return data.return_object["WWN WordRelInfo"].WordRelInfo.Distance;

  } catch (error) {
    console.error("Error in getSimilarity:", error);
    return 9999;
  }
}

// 유틸리티 함수들
function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function pickRandomTags(tagList, count = 2) {
  const shuffled = [...tagList].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
}

function convertViews(views) {
  if (views >= 10000000) return `${(views / 10000000).toFixed(1).replace(/\.0$/, '')}천만`;
  if (views >= 1000000)  return `${(views / 1000000).toFixed(1).replace(/\.0$/, '')}백만`;
  if (views >= 10000)    return `${(views / 10000).toFixed(1).replace(/\.0$/, '')}만`;
  if (views >= 1000)     return `${(views / 1000).toFixed(1).replace(/\.0$/, '')}천`;
  return views.toString();
}

function convertDate(dateString) {
  const targetDate = new Date(dateString);
  const currentDate = new Date();
  const timeDifference = currentDate - targetDate;
  const oneYearMs = 31536000000;

  if (timeDifference < 86400000) return "오늘";
  if (timeDifference < 172800000) return "어제";
  if (timeDifference < 604800000) return "1주 전";
  if (timeDifference < oneYearMs) {
    const diffMonths = (currentDate.getFullYear() - targetDate.getFullYear()) * 12 + (currentDate.getMonth() - targetDate.getMonth());
    return diffMonths <= 1 ? "1개월 전" : `${diffMonths}개월 전`;
  }
  return `${Math.floor(timeDifference / oneYearMs)}년 전`;
}


function showLoadingSpinner() {
  const videoListDiv = document.getElementById("video__list");
  videoListDiv.innerHTML = `
    <div style="display: flex; justify-content: center; align-items: center; width: 430px; padding: 40px">
      <div class="spinner" style="width: 30px; height: 30px; border: 3px solid #ccc; border-top: 3px solid #333; border-radius: 50%; animation: spin 1s linear infinite;"></div>
    </div>
  `;
}

// 로딩 스피너
const style = document.createElement('style');
style.innerHTML = `
@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
`;
document.head.appendChild(style);


// 메인 화면 생성 함수
async function createVideoItem(videoList) {
  const [currentVideoInfo, videoInfoList] = await Promise.all([
    getVideoInfo(videoId),
    Promise.all(videoList.map(video => getVideoInfo(video.id)))
  ]);

  const { tags: targetTagList, channel_id: channelId } = currentVideoInfo;
  const currentChannelInfo = await getChannelInfo(channelId);

  renderCurrentVideo(currentVideoInfo);
  renderVideoAndChannelInfo(currentVideoInfo, currentChannelInfo);
  renderTags(currentChannelInfo, targetTagList);

  const channelVideos = videoInfoList.filter(video => video.channel_id === channelId);
  const filteredChannelVideos = channelVideos.filter(video => video.id !== Number(videoId));
  renderVideoList(filteredChannelVideos);
}


// 렌더링 함수들
function renderCurrentVideo(videoInfo) {
  const videoContainer = document.getElementById("video__container");
  videoContainer.innerHTML = `
    <video id="current__video" controls autoplay muted>
      <source src="https://storage.googleapis.com/youtube-clone-video/${videoInfo.id}.mp4">
    </video>
  `;
}


function renderVideoAndChannelInfo(videoInfo, channelInfo) {
  // 비디오 제목 + 조회수 + 업로드일 + 비디오 설명
  document.getElementById("video__title").innerHTML = `<div class="video__title">${videoInfo.title}</div>`;
  
  document.getElementById("video__info__text").innerHTML = `
    <p>조회수 ${convertViews(videoInfo.views)}회 • ${convertDate(videoInfo.created_dt)}</p>

  `;

  // 채널 프로필 + 채널명 + 구독자 수
  const channelURL = `./channel.html?channelId=${channelInfo.id}`;
  document.getElementById("channel__info__box").innerHTML = `
    <div class="channel__profile">
      <img src="${channelInfo.channel_profile}" alt="">
    </div>
    <a href="${channelURL}">
      <div id="channel__info__text" class="channel__info__text">
        <h5>${channelInfo.channel_name}</h5>
        <p>구독자 ${convertViews(channelInfo.subscribers)}명</p>
      </div>
    </a>
  `;

  // 채널 설명
  document.getElementById("channel__info__downside").innerHTML = `
    <p>${videoInfo.description}</p>
    <button>SHOW MORE</button>
  `;
}


function renderTags(channelInfo, tagList) {
  const recoSortButtons = document.getElementById("reco__sort__buttons");
  recoSortButtons.innerHTML = "";

  const buttons = []; // 모든 버튼을 저장할 배열

  // 채널 버튼
  const channelButton = document.createElement("button");
  channelButton.textContent = channelInfo.channel_name;
  channelButton.classList.add("selected"); // 초기 selected
  channelButton.addEventListener("click", async () => {
    toggleSelected(channelButton, buttons);
    await loadChannelVideos(channelInfo.id);
  });
  buttons.push(channelButton);
  recoSortButtons.appendChild(channelButton);

  // 태그 버튼들
  tagList.forEach(tag => {
    const tagButton = document.createElement("button");
    tagButton.textContent = tag;
    tagButton.addEventListener("click", async () => {
      toggleSelected(tagButton, buttons);
      await loadSimilarVideos(tag);
    });
    buttons.push(tagButton);
    recoSortButtons.appendChild(tagButton);
  });
}

// 버튼 selected 토글하는 헬퍼 함수
function toggleSelected(clickedButton, allButtons) {
  allButtons.forEach(btn => btn.classList.remove("selected"));
  clickedButton.classList.add("selected");
}



async function calculateVideoSimilarities(videoList, fixedTargetTags) {
  const filteredVideoList = [];

  // 유사성을 비교할 전체 비디오에 대해서 반복실행
  for (const video of videoList) {

    
    const randomVideoTags = pickRandomTags(video.tags, 2); // 비디오의 태그중 2개를 랜덤 선정
    const targetTag = fixedTargetTags[0]; // 현재 사용자가 클릭한 태그

    let totalDistance = 0; //유사도 초기화

    // 비교할 태그 n개에 대해서 반복실행
    for (const videoTag of randomVideoTags) {
      try {
        let distance = await getSimilarity(videoTag, targetTag);
        await delay(10); // 연속적인 요청에 의한 에러(429) 발생 우회

        // 간단한 가중치 부여
        if (typeof distance === "number" && !isNaN(distance) && distance !== -1) {
          console.log(`비교: 영상태그(${videoTag}) - 타겟태그(${targetTag}) => 유사도: ${distance}`);
          if (distance == 0){
            distance -= 4
          }
          if (distance == 1){
            distance -= 3
          }
          if (distance == 2){
            distance -= 2
          }
          totalDistance += distance;
        }
      } catch (error) {
        console.error("Error in calculateVideoSimilarities:", error);
      }
    }

    filteredVideoList.push({ ...video, score: totalDistance });
  }

  // 유사도에 따라 정렬
  return filteredVideoList.sort((a, b) => a.score - b.score);
}


async function renderVideoList(videoList) {
  const videoListDiv = document.getElementById("video__list");
  
  const items = await Promise.all(videoList.slice(0, 7).map(async video => {
    const videoURL = `./video.html?id=${video.id}`;
    const channelURL = `./channel.html?channelId=${video.channel_id}`;
    const channelInfo = await getChannelInfo(video.channel_id); // <- 여기 await!
    
    return `
      <div class="video__box">
        <div class="video__thumbnail">
          <img src="${video.thumbnail}" alt="">
        </div>
        <div class="video__textbox">
          <a href="${videoURL}"><h4>${video.title}</h4></a>
          <a href="${channelURL}"><p>${channelInfo.channel_name}</p></a>
          <p>조회수 ${convertViews(video.views)} • ${convertDate(video.created_dt)}</p>
        </div>
      </div>
    `;
  }));

  videoListDiv.innerHTML = items.join('');
}

async function loadChannelVideos(channelId) {
  showLoadingSpinner();

  const response = await fetch(`https://www.techfree-oreumi-api.ai.kr/video/getChannelVideoList?channel_id=${encodeURIComponent(channelId)}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  const channelVideos = await response.json();
  const filteredChannelVideoInfoList = channelVideos.filter(video => video.id !== Number(videoId));

  renderVideoList(filteredChannelVideoInfoList);
}


async function loadSimilarVideos(tag) {
  showLoadingSpinner();

  if (tagCache[tag]) {
    renderVideoList(tagCache[tag]);
    return;
  }

  const videoList = await getVideoList();
  const videoInfoList = await Promise.all(videoList.map(video => getVideoInfo(video.id)));

  const filteredVideoInfoList = videoInfoList.filter(video => video.id !== Number(videoId));

  const filteredVideoList = await calculateVideoSimilarities(filteredVideoInfoList, [tag]);
  tagCache[tag] = filteredVideoList;
  renderVideoList(filteredVideoList);
}
