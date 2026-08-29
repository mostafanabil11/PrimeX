import cv2
import numpy as np
import sys

def main():
    img_path = r'C:/Users/zas/.gemini/antigravity/brain/adb205a7-5cd5-4482-8700-e0f8be9b4150/.user_uploaded/media_1788042241401.jpg'
    img = cv2.imread(img_path)
    if img is None:
        print("Failed to load image")
        sys.exit(1)
        
    print(f"Original shape: {img.shape}")
    
    # Convert to grayscale
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # The logo is bright, background is dark
    # Let's threshold it
    _, mask = cv2.threshold(gray, 40, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    # Find the bounding box of the logo
    # Filter out small noise and the AC unit at the top
    # The logo is in the middle.
    
    x_min, y_min = img.shape[1], img.shape[0]
    x_max, y_max = 0, 0
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        area = cv2.contourArea(cnt)
        if area > 100 and y > 200: # filter out AC unit which is likely at the top (y < 200)
            x_min = min(x_min, x)
            y_min = min(y_min, y)
            x_max = max(x_max, x + w)
            y_max = max(y_max, y + h)
            
    # Add some padding
    pad = 20
    x_min = max(0, x_min - pad)
    y_min = max(0, y_min - pad)
    x_max = min(img.shape[1], x_max + pad)
    y_max = min(img.shape[0], y_max + pad)
    
    cropped = img[y_min:y_max, x_min:x_max]
    print(f"Cropped shape: {cropped.shape}")
    
    # Save cropped image to inspect
    cv2.imwrite('logo_cropped.jpg', cropped)
    
    # Now let's create a transparent PNG
    # The background is very dark. We can create an alpha channel where 
    # pixels brighter than a threshold are opaque, but with smooth transition.
    
    gray_cropped = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    
    # Create an alpha mask: mapping [20, 80] to [0, 255]
    alpha = np.clip((gray_cropped.astype(float) - 20) * (255.0 / (80 - 20)), 0, 255).astype(np.uint8)
    
    b, g, r = cv2.split(cropped)
    rgba = cv2.merge((b, g, r, alpha))
    cv2.imwrite('logo_transparent.png', rgba)
    
    # Another approach: rembg if it's available
    try:
        from rembg import remove
        from PIL import Image
        input_img = Image.open('logo_cropped.jpg')
        output_img = remove(input_img)
        output_img.save('logo_rembg.png')
        print("Successfully created logo_rembg.png")
    except ImportError:
        print("rembg not installed or failed")
    except Exception as e:
        print(f"rembg failed: {e}")

if __name__ == '__main__':
    main()
