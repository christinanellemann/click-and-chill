from PIL import Image
import os

source_file = "popcornActive.PNG"
dest_file = "favicon.png"

if os.path.exists(source_file):
    try:
        img = Image.open(source_file)
        # Get the bounding box of the non-transparent area
        bbox = img.getbbox()
        if bbox:
            # Crop to the content (removing transparent borders)
            # This makes the content fill the square, appearing "bigger"
            cropped_img = img.crop(bbox)
            cropped_img.save(dest_file)
            print(f"Success: Created {dest_file} by cropping whitespace from {source_file}")
        else:
            print("Image is empty.")
    except Exception as e:
        print(f"Error: {e}")
else:
    print(f"{source_file} not found")
