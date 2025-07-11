const dropArea = document.getElementById("drop-area");
const fileInput = document.getElementById("fileElem");
const uploadBtn = document.getElementById("uploadBtn");
const convertBtn = document.getElementById("convertBtn");
const fileListPreview = document.getElementById("file-list");
const status = document.getElementById("status-message");

let selectedFiles = null;

// 🚫 드래그 기본 이벤트 막기
["dragenter", "dragover", "dragleave", "drop"].forEach(eventName => {
  dropArea.addEventListener(eventName, e => {
    e.preventDefault();
    e.stopPropagation();
  });
});

// 📁 클릭 시 파일 선택창 열기
dropArea.addEventListener("click", () => fileInput.click());
uploadBtn.addEventListener("click", () => fileInput.click());

// 📥 파일 선택 처리 (드래그 또는 클릭)
dropArea.addEventListener("drop", e => {
  selectedFiles = e.dataTransfer.files;
  handleFileSelection(selectedFiles);
});
fileInput.addEventListener("change", () => {
  selectedFiles = fileInput.files;
  handleFileSelection(selectedFiles);
});

// ⚙️ 변환 버튼 클릭
convertBtn.addEventListener("click", () => {
  fetch("/convert", { method: "POST" })
    .then(() => {
      fetchFileListFromServer();
      showStatus("🖼️ 변환 완료되었습니다.", "green");
    })
    .catch(error => {
      alert("변환 실패: " + error);
      showStatus("❌ 변환 실패", "red");
    });
});

// 📌 파일 선택 후 처리
function handleFileSelection(files) {
  if (!files || files.length === 0) {
    alert("선택된 파일이 없습니다.");
    return;
  }

  if (files.length > 20) {
    alert("최대 20개의 TIFF 파일만 업로드할 수 있습니다.");
    return;
  }

    // 1단계: 서버에 이미 업로드된 파일 이름 가져오기
  fetch("/uploaded-files")
    .then(response => response.json())
    .then(existingFiles => {
      const duplicates = [];
      const validFiles = [];

      for (let i = 0; i < files.length; i++) {
        const name = files[i].name;
        if (existingFiles.map(f => f.toLowerCase()).includes(name.toLowerCase())) {
          duplicates.push(files[i]);
        } else {
          validFiles.push(files[i]);
        }
      }

      showFilePreview(files);

      if (duplicates.length > 0) {
        showDuplicateModal(duplicates, validFiles);
      } else {
        uploadFiles(validFiles);
      }
    })
    .catch(error => {
      alert("⚠️ 파일 확인 실패: " + error);
    });
}

// 📤 서버로 파일 업로드
function uploadFiles(files) {
  const formData = new FormData();
  for (let i = 0; i < files.length; i++) {
    formData.append("files", files[i]);
  }

  fetch("/upload", {
  method: "POST",
  body: formData
})
  .then(res => res.json())
  .then(data => {
    const status = document.getElementById("status-message");

    if (data.status === "success") {
      alert("✅ " + data.message);
      status.textContent = "✅ " + data.message;
      status.style.color = "green";

      if (data.invalid.length > 0) {
        alert("❗ 무시된 파일: " + data.invalid.join(", "));
      }

      fetchFileListFromServer();
    } else {
      alert("❌ " + data.message);
      status.textContent = "❌ " + data.message;
      status.style.color = "red";
    }
  })
  .catch(error => {
    alert("❌ 업로드 실패: " + error);
  });
}

// 📄 업로드된 파일 목록 서버에서 불러오기
function fetchFileListFromServer() {
  fetch("/uploaded-files")
    .then(response => response.json())
    .then(files => {
      dropArea.innerHTML = `📂 총 ${files.length}개 파일 업로드됨 (최대 20개)`;
      fileListPreview.innerHTML = "";

      files.forEach(file => {
        const li = document.createElement("li");
        li.textContent = file;

        // 삭제 버튼 추가
        const deleteBtn = document.createElement("button");
        deleteBtn.textContent = "❌";
        deleteBtn.style.marginLeft = "10px";
        deleteBtn.onclick = () => deleteFile(file);

        li.appendChild(deleteBtn);
        fileListPreview.appendChild(li);
      });
    })
    .catch(() => {
      showStatus("❌ 파일 목록 불러오기 실패", "red");
    });
}

// 🟢 상태 메시지 표시
function showStatus(message, color = "black") {
  status.textContent = message;
  status.style.color = color;
}

// 🌐 페이지 로드 시 업로드 목록 초기 로딩
window.addEventListener("DOMContentLoaded", () => {
  fetchFileListFromServer();
});

// 📄 파일 미리보기 표시
function showDuplicateModal(duplicates, validFiles) {
  const modal = document.getElementById("duplicate-modal");
  const list = document.getElementById("duplicate-list");
  const overwriteBtn = document.getElementById("overwriteBtn");
  const skipBtn = document.getElementById("skipBtn");
  const cancelBtn = document.getElementById("cancelBtn");

  list.innerHTML = "";
  duplicates.forEach(file => {
    const li = document.createElement("li");
    li.textContent = file.name;
    list.appendChild(li);
  });

  modal.style.display = "flex";

  overwriteBtn.onclick = () => {
    modal.style.display = "none";
    const allFiles = validFiles.concat(duplicates);
    uploadFiles(allFiles);
  };

  skipBtn.onclick = () => {
    modal.style.display = "none";
    uploadFiles(validFiles);
  };

  cancelBtn.onclick = () => {
    modal.style.display = "none";
    showStatus("🚫 업로드가 취소되었습니다.", "gray");
  };
}

// 🖼️ 파일 미리보기 리스트 표시
function showFilePreview(files) {
  dropArea.innerHTML = `📂 ${files.length}개 파일 선택됨 (최대 20개)`;
  fileListPreview.innerHTML = "";

  for (let i = 0; i < files.length; i++) {
    const li = document.createElement("li");
    li.textContent = files[i].name;
    fileListPreview.appendChild(li);
  }
}

function deleteFile(filename) {
  if (!confirm(`${filename} 파일을 삭제하시겠습니까?`)) return;

  fetch("/delete-file", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ filename })
  })
    .then(res => res.json())
    .then(data => {
      if (data.status === "success") {
        showStatus("🗑️ " + data.message, "gray");
        fetchFileListFromServer();
      } else {
        showStatus("❌ " + data.message, "red");
      }
    })
    .catch(error => {
      alert("❌ 삭제 실패: " + error);
    });
}

