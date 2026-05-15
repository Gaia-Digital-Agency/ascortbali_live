
import json
import os
import sys
from urllib.parse import urlparse
from urllib.request import Request, urlopen


def detect_watermark_with_ocr(image):
    """
    Use EasyOCR to find the watermark text bounding boxes.
    Returns list of bounding boxes [[x1,y1],[x2,y2],[x3,y3],[x4,y4]].
    """
    import cv2
    import numpy as np
    import easyocr
    reader = easyocr.Reader(['en'], gpu=False, verbose=False)

    # Convert BGR to RGB
    image_rgb = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = reader.readtext(image_rgb)

    watermark_boxes = []
    watermark_keywords = ['euro', 'girl', 'escort', '.com', 'eurogirlsescort',
                          'eurogirls', 'girlsescort', 'ort.com', 'uro', 'irl',
                          'scort', 'ort', 'com']

    print(f"  OCR found {len(results)} text regions:")
    for (bbox, text, conf) in results:
        text_lower = text.lower().replace(' ', '')
        print(f"    '{text}' (conf: {conf:.2f})")
        # Check if this text is part of the watermark
        is_watermark = any(kw in text_lower for kw in watermark_keywords)
        # Also catch partial matches with low confidence (watermark is semi-transparent)
        if is_watermark or conf < 0.4:
            watermark_boxes.append(bbox)
            print(f"      -> Marked as watermark")

    return watermark_boxes


def create_ocr_mask(image, boxes, padding=10):
    """
    Create a mask from OCR-detected bounding boxes.
    Since OCR may only detect parts of the watermark (where contrast is high),
    we use detected boxes to find the text's vertical position, then extend
    the mask as a full horizontal band to cover the entire watermark line.
    """
    import cv2
    import numpy as np
    h, w = image.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    if not boxes:
        return mask

    # Find the vertical extent of all detected text boxes
    all_y = []
    all_x = []
    for box in boxes:
        pts = np.array(box, dtype=np.int32)
        all_y.extend(pts[:, 1].tolist())
        all_x.extend(pts[:, 0].tolist())

    y_min = min(all_y) - padding
    y_max = max(all_y) + padding
    # Extend horizontally across the full image width (watermark spans wide)
    x_min = int(w * 0.04)
    x_max = int(w * 0.96)

    # Clamp
    y_min = max(0, y_min)
    y_max = min(h, y_max)

    # Create horizontal band mask
    mask[y_min:y_max, x_min:x_max] = 255

    # Small dilation for safety
    kernel = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    mask = cv2.dilate(mask, kernel, iterations=1)

    return mask


def create_fallback_mask(image):
    """
    If OCR doesn't find the watermark, use a fixed rectangular mask
    based on the known watermark position pattern.
    """
    import numpy as np
    h, w = image.shape[:2]
    mask = np.zeros((h, w), dtype=np.uint8)

    # The "EuroGirlsEscort.com" watermark typically sits in this region
    y1 = int(h * 0.40)
    y2 = int(h * 0.48)
    x1 = int(w * 0.08)
    x2 = int(w * 0.92)

    mask[y1:y2, x1:x2] = 255
    return mask


def get_extension(url: str) -> str:
    path = urlparse(url).path
    _, ext = os.path.splitext(path)
    return ext if ext else ".jpg"


def download(url: str, dest_path: str) -> None:
    req = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(req, timeout=30) as resp, open(dest_path, "wb") as f:
        while True:
            chunk = resp.read(1024 * 64)
            if not chunk:
                break
            f.write(chunk)


def remove_watermark_lama(input_path, output_path, debug_dir):
    """
    Remove watermark using OCR detection + LaMa inpainting.
    """
    import cv2
    import numpy as np
    import torch
    from PIL import Image
    from simple_lama_inpainting.utils.util import prepare_img_and_mask, download_model

    image_cv = cv2.imread(input_path)
    if image_cv is None:
        print(f"  Error: Could not read {input_path}")
        return False

    filename = os.path.basename(input_path)
    name, ext = os.path.splitext(filename)

    # Step 1: Detect watermark text with OCR
    print("  Running OCR detection...")
    boxes = detect_watermark_with_ocr(image_cv)

    if boxes:
        print(f"  Found {len(boxes)} watermark regions via OCR")
        mask = create_ocr_mask(image_cv, boxes, padding=12)
    else:
        print("  OCR didn't find watermark, using fallback mask")
        mask = create_fallback_mask(image_cv)

    # Save debug mask
    debug_mask_path = os.path.join(debug_dir, f"{name}_mask.png")
    cv2.imwrite(debug_mask_path, mask)
    print(f"  Debug mask saved: {debug_mask_path}")

    # Step 2: LaMa inpainting
    image_rgb = cv2.cvtColor(image_cv, cv2.COLOR_BGR2RGB)
    pil_image = Image.fromarray(image_rgb)
    pil_mask = Image.fromarray(mask)

    device = torch.device("mps" if hasattr(torch.backends, "mps") and torch.backends.mps.is_available() else "cpu")
    lama_url = "https://github.com/enesmsahin/simple-lama-inpainting/releases/download/v0.1.0/big-lama.pt"
    model_path = os.environ.get("LAMA_MODEL") or download_model(lama_url)
    print(f"  Loading LaMa model on {device.type}...")
    model = torch.jit.load(model_path, map_location=device)
    model.eval()
    model.to(device)

    print("  Running LaMa inpainting...")
    img_t, mask_t = prepare_img_and_mask(pil_image, pil_mask, device)
    with torch.inference_mode():
        inpainted = model(img_t, mask_t)

    cur_res = inpainted[0].permute(1, 2, 0).detach().cpu().numpy()
    cur_res = np.clip(cur_res * 255, 0, 255).astype(np.uint8)
    orig_h, orig_w = image_cv.shape[:2]
    cur_res = cur_res[:orig_h, :orig_w]
    Image.fromarray(cur_res).save(output_path)
    print(f"  Saved: {output_path}")
    return True


if __name__ == '__main__':
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["download", "clean", "all"], default="all", nargs="?",
                        help="download = fetch images only, clean = remove watermarks only, all = both")
    args = parser.parse_args()

    base_dir = os.path.dirname(os.path.abspath(__file__))
    image_output_file = os.path.join(base_dir, "image_output.json")
    images_dir = os.path.join(base_dir, "watermark", "watermark_images")
    target_dir = os.path.join(images_dir, "target")
    clean_dir = os.path.join(base_dir, "..", "app", "Assets", "Creator", "clean_image")
    debug_dir = os.path.join(base_dir, "watermark", "debug")

    os.makedirs(images_dir, exist_ok=True)
    os.makedirs(target_dir, exist_ok=True)
    os.makedirs(clean_dir, exist_ok=True)
    os.makedirs(debug_dir, exist_ok=True)

    if not os.path.isfile(image_output_file):
        print(f"Missing image_output.json: {image_output_file}")
        sys.exit(1)

    with open(image_output_file, "r", encoding="utf-8") as f:
        items = json.load(f)

    if not isinstance(items, list) or not items:
        print("image_output.json is empty or invalid.")
        sys.exit(1)

    # Step 1: Download
    if args.mode in ("download", "all"):
        print(f"Downloading {len(items)} image(s)...\n")
        for item in items:
            image_id = item.get("id")
            url = item.get("url")
            if not image_id or not url:
                continue

            ext = get_extension(url)
            download_name = f"{image_id}{ext}"
            input_path = os.path.join(target_dir, download_name)

            if os.path.exists(input_path):
                print(f"  Already downloaded: {download_name}")
                continue

            print(f"  Downloading: {image_id}")
            try:
                download(url, input_path)
                print(f"    Saved: {input_path}")
            except Exception as e:
                print(f"    Failed: {url} -> {e}")

        print(f"\nDownloads in: {target_dir}\n")

    # Step 2: Clean (remove watermarks)
    if args.mode in ("clean", "all"):
        print(f"Cleaning {len(items)} image(s)...\n")
        for item in items:
            image_id = item.get("id")
            url = item.get("url")
            if not image_id or not url:
                continue

            ext = get_extension(url)
            download_name = f"{image_id}{ext}"
            input_path = os.path.join(target_dir, download_name)

            clean_id = image_id.replace("IMW_", "IM_", 1)
            output_name = f"{clean_id}{ext}"
            output_path = os.path.join(clean_dir, output_name)

            if os.path.exists(output_path):
                print(f"  Already clean: {output_name}")
                continue

            if not os.path.exists(input_path):
                print(f"  Missing download: {download_name} (run 'download' first)")
                continue

            print(f"  Processing: {image_id}")
            try:
                remove_watermark_lama(input_path, output_path, debug_dir)
            except Exception as e:
                print(f"    Failed: {e}")
            print()

        print(f"Done! Results in: {clean_dir}")
        print(f"Debug files in: {debug_dir}")
