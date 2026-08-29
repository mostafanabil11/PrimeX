import vtracer
import cv2
import numpy as np
import subprocess

def main():
    input_img = r'C:/Users/zas/Desktop/Main projects/PrimeX/real_logo_transparent.png'
    out_svg = r'C:/Users/zas/Desktop/Main projects/PrimeX/real_logo_vector.svg'
    out_svg_artifact = r'C:/Users/zas/.gemini/antigravity/brain/adb205a7-5cd5-4482-8700-e0f8be9b4150/real_logo_vector.svg'
    
    # 1. Vectorize using vtracer
    vtracer.convert_image_to_svg_py(
        input_img,
        out_svg,
        colormode="color",
        hierarchical="stacked",
        mode="spline",
        filter_speckle=10, 
        color_precision=8,
        layer_difference=16,
        corner_threshold=60,
        length_threshold=4.0,
        max_iterations=10,
        splice_threshold=45,
        path_precision=8
    )
    print("Saved SVG to", out_svg)
    
    # Copy SVG to artifact
    import shutil
    shutil.copy(out_svg, out_svg_artifact)
    
    # 2. Let's also create an artificially upscaled PNG for crispness
    img = cv2.imread(input_img, cv2.IMREAD_UNCHANGED)
    
    # Upscale 4x using cubic interpolation
    scale = 4
    upscaled = cv2.resize(img, (0, 0), fx=scale, fy=scale, interpolation=cv2.INTER_CUBIC)
    
    # The edges might be soft. We can use a threshold on the alpha channel to make it razor sharp.
    b, g, r, a = cv2.split(upscaled)
    
    # Clean up the colors to pure white and red
    # Red parts: max(r)>max(g,b)
    # White parts: r,g,b all high
    # Let's just enhance the contrast of RGB
    # Just threshold alpha
    _, a_thresh = cv2.threshold(a, 127, 255, cv2.THRESH_BINARY)
    
    # Slightly blur the alpha for anti-aliasing (smooth crisp edge)
    a_smooth = cv2.GaussianBlur(a_thresh, (5, 5), 0)
    
    upscaled_sharp = cv2.merge((b, g, r, a_smooth))
    
    out_png = r'C:/Users/zas/Desktop/Main projects/PrimeX/real_logo_high_res.png'
    out_png_artifact = r'C:/Users/zas/.gemini/antigravity/brain/adb205a7-5cd5-4482-8700-e0f8be9b4150/real_logo_high_res.png'
    
    cv2.imwrite(out_png, upscaled_sharp)
    print("Saved High-Res PNG to", out_png)
    
    shutil.copy(out_png, out_png_artifact)
    
if __name__ == '__main__':
    main()
