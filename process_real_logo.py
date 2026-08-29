import cv2
import numpy as np

def main():
    img_path = r'C:/Users/zas/.gemini/antigravity/brain/adb205a7-5cd5-4482-8700-e0f8be9b4150/.user_uploaded/media_1788042757821.jpg'
    img = cv2.imread(img_path)
    if img is None:
        print("Failed to load image")
        return
        
    # Convert to grayscale to find bounding box
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    # Threshold to find non-black areas
    _, mask = cv2.threshold(gray, 15, 255, cv2.THRESH_BINARY)
    
    # Find contours
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    
    x_min, y_min = img.shape[1], img.shape[0]
    x_max, y_max = 0, 0
    
    # We want to ignore the "Add comment..." UI at the bottom
    # The logo is roughly in the middle half of the image
    height = img.shape[0]
    
    for cnt in contours:
        x, y, w, h = cv2.boundingRect(cnt)
        # Filter out noise and UI elements
        if w > 10 and h > 10 and y < height * 0.8: 
            x_min = min(x_min, x)
            y_min = min(y_min, y)
            x_max = max(x_max, x + w)
            y_max = max(y_max, y + h)
            
    # Add padding
    pad = 10
    x_min = max(0, x_min - pad)
    y_min = max(0, y_min - pad)
    x_max = min(img.shape[1], x_max + pad)
    y_max = min(img.shape[0], y_max + pad)
    
    # Crop
    cropped = img[y_min:y_max, x_min:x_max]
    
    # Create alpha channel
    # Anything very dark becomes transparent
    cropped_gray = cv2.cvtColor(cropped, cv2.COLOR_BGR2GRAY)
    
    # We want a smooth transition for anti-aliasing
    # Values below 15 are transparent (0)
    # Values above 50 are fully opaque (255)
    # Values in between are interpolated
    
    alpha = np.clip((cropped_gray.astype(float) - 15) * (255.0 / (50 - 15)), 0, 255).astype(np.uint8)
    
    # But wait, red parts might have lower grayscale value (e.g. pure red is only ~76 in gray)
    # Let's use the maximum of R, G, B to determine alpha instead of grayscale
    b, g, r = cv2.split(cropped)
    max_rgb = np.maximum(np.maximum(r, g), b)
    
    alpha2 = np.clip((max_rgb.astype(float) - 10) * (255.0 / (30 - 10)), 0, 255).astype(np.uint8)
    
    rgba = cv2.merge((b, g, r, alpha2))
    
    output_path = r'C:/Users/zas/Desktop/Main projects/PrimeX/real_logo_transparent.png'
    cv2.imwrite(output_path, rgba)
    print("Saved to", output_path)

if __name__ == '__main__':
    main()
