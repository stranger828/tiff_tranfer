from flask import Flask, render_template, request, redirect, url_for, flash
from flask import jsonify
from PIL import Image
import os

app = Flask(__name__)
app.secret_key = "supersecretkey"

BASE_DIR = os.path.abspath(os.path.dirname(__file__))
UPLOAD_FOLDER = os.path.join(BASE_DIR, 'uploads')
OUTPUT_FOLDER = os.path.join(BASE_DIR, 'output')
ALLOWED_EXTENSIONS = {'tif', 'tiff'}

# 폴더가 없으면 생성
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    files = request.files.getlist("files")

    existing_files = [
        f for f in os.listdir(UPLOAD_FOLDER)
        if os.path.isfile(os.path.join(UPLOAD_FOLDER, f)) and allowed_file(f)
    ]

    total_files = len(existing_files) + len(files)
    if total_files > 20:
        return jsonify({"status": "error", "message": "총 업로드 파일 수가 20개를 초과할 수 없습니다."})
    
    if not files:
        return jsonify({"status": "error", "message": "업로드된 파일이 없습니다."})

    if len(files) > 20:
        return jsonify({"status": "error", "message": "최대 20개까지만 업로드할 수 있습니다."})

    count = 0
    invalid = []

    for file in files:
        if file and allowed_file(file.filename):
            filename = file.filename
            path = os.path.join(UPLOAD_FOLDER, filename)
            file.save(path)
            count += 1
        else:
            invalid.append(file.filename)

    if count == 0:
        return jsonify({"status": "error", "message": "유효한 TIFF 파일이 없습니다."})

    return jsonify({
        "status": "success",
        "message": f"{count}개 파일 업로드 완료",
        "invalid": invalid
    })

@app.route('/convert', methods=['POST'])
def convert():
    converted = 0
    failed = 0

    for filename in os.listdir(UPLOAD_FOLDER):
        if allowed_file(filename):
            tiff_path = os.path.join(UPLOAD_FOLDER, filename)
            jpg_name = os.path.splitext(filename)[0] + '.jpg'
            jpg_path = os.path.join(OUTPUT_FOLDER, jpg_name)

            try:
                with Image.open(tiff_path) as img:
                    rgb_img = img.convert("RGB")
                    rgb_img.save(jpg_path, "JPEG")
                converted += 1
                os.remove(tiff_path)  # TIFF 삭제
            except Exception as e:
                failed += 1
                print(f"[변환 실패] {filename}: {e}")

    if converted == 0:
        flash("변환할 TIFF 파일이 없습니다.")
    else:
        flash(f"{converted}개 파일 변환 완료")
        if failed > 0:
            flash(f"{failed}개 파일은 오류로 변환되지 않았습니다.")

    return redirect(url_for('index'))


@app.route('/uploaded-files', methods=['GET'])
def uploaded_files():
    try:
        files = [
            f for f in os.listdir(UPLOAD_FOLDER)
            if os.path.isfile(os.path.join(UPLOAD_FOLDER, f)) and allowed_file(f)
        ]
        return jsonify(files)
    except Exception as e:
        print(f"[파일 리스트 오류] {e}")
        return jsonify([]), 500
    

@app.route('/delete-file', methods=['POST'])
def delete_file():
    data = request.get_json()
    filename = data.get("filename")

    if not filename:
        return jsonify({"status": "error", "message": "파일명이 제공되지 않았습니다."}), 400

    filepath = os.path.join(UPLOAD_FOLDER, filename)

    try:
        if os.path.exists(filepath):
            os.remove(filepath)
            return jsonify({"status": "success", "message": f"{filename} 삭제됨"})
        else:
            return jsonify({"status": "error", "message": "파일이 존재하지 않습니다."}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": f"삭제 실패: {str(e)}"}), 500


if __name__ == '__main__':
    app.run(debug=True)





