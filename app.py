from flask import Flask, render_template, request, redirect, url_for, flash
from PIL import Image
import os

app = Flask(__name__)
app.secret_key = "secret_key"  # Flash 메시지용

UPLOAD_FOLDER = 'uploads'
OUTPUT_FOLDER = 'uploads/jpg_output'
ALLOWED_EXTENSIONS = {'tif', 'tiff'}

os.makedirs(UPLOAD_FOLDER, exist_ok=True)
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/upload', methods=['POST'])
def upload():
    if 'file' not in request.files:
        flash('파일이 없습니다.')
        return redirect(url_for('index'))

    file = request.files['file']

    if file.filename == '':
        flash('파일이 선택되지 않았습니다.')
        return redirect(url_for('index'))

    if file and allowed_file(file.filename):
        filename = file.filename
        tiff_path = os.path.join(UPLOAD_FOLDER, filename)
        jpg_path = os.path.join(OUTPUT_FOLDER, os.path.splitext(filename)[0] + '.jpg')

        file.save(tiff_path)

        try:
            with Image.open(tiff_path) as img:
                rgb_img = img.convert("RGB")
                rgb_img.save(jpg_path, "JPEG")
            flash(f"{filename} → JPG 변환 완료!")
        except Exception as e:
            flash(f"오류 발생: {str(e)}")
        finally:
            os.remove(tiff_path)

    else:
        flash('TIFF 파일만 업로드할 수 있습니다.')

    return redirect(url_for('index'))

if __name__ == '__main__':
    app.run(debug=True)