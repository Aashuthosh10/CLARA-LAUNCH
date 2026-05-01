import sys
from rembg import remove

input_path = r"C:\SVIT\Model\Clara\CLARA-LAUNCH\frontend\dist\svit-logo-clean.png"
output_path = r"C:\SVIT\Model\Clara\CLARA-LAUNCH\frontend\src\assets\logo\svit_logo_transparent.png"

print("Removing background with rembg...")
try:
    with open(input_path, 'rb') as i:
        input_data = i.read()
        
    output_data = remove(input_data)
    
    with open(output_path, 'wb') as o:
        o.write(output_data)
        
    print("Done!")
except Exception as e:
    print(f"Error: {e}")
