import sys
import math
from PIL import Image, ImageFilter

def process_logo(input_path, output_path):
    print(f"Processing {input_path}...")
    try:
        img = Image.open(input_path).convert("RGBA")
    except Exception as e:
        print(f"Error opening image: {e}")
        return

    width, height = img.size
    pixels = img.load()

    # Step 1: Detect background color (assume top-left pixel is background, or just use white)
    bg_r, bg_g, bg_b = 255, 255, 255

    # Step 2: Create a soft alpha mask based on color distance from white
    # This automatically anti-aliases edges because the transition is smooth.
    for y in range(height):
        for x in range(width):
            r, g, b, a = pixels[x, y]
            
            # Calculate distance from pure white (0-441 range)
            dist = math.sqrt((255 - r)**2 + (255 - g)**2 + (255 - b)**2)
            
            # Thresholds for transparency
            # Very close to white -> completely transparent
            if dist < 15:
                pixels[x, y] = (r, g, b, 0)
            # Edge transition -> partial transparency for anti-aliasing
            elif dist < 80:
                # scale alpha from 0 to 255 based on distance
                alpha = int(((dist - 15) / 65.0) * 255)
                # To prevent white fringing, we can tint the pixel towards its original color or keep it as is
                pixels[x, y] = (r, g, b, alpha)
            # Far from white -> keep fully opaque
            else:
                pixels[x, y] = (r, g, b, 255)

    print(f"Saving to {output_path}...")
    img.save(output_path, "PNG")
    print("Done!")

if __name__ == "__main__":
    input_file = r"C:\SVIT\Model\Clara\CLARA-LAUNCH\frontend\src\assets\logo\svit_logo_clean.png"
    output_file = r"C:\SVIT\Model\Clara\CLARA-LAUNCH\frontend\src\assets\logo\svit_logo_transparent.png"
    process_logo(input_file, output_file)
