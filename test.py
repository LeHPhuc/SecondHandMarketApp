# test_distance.py
from EcoReMartApp.location import get_directions_distance

API_KEY = "YOUR_MAPBOX_API_KEY"

result = get_directions_distance("142 Khiếu Năng Tĩnh, An Lạc A, Bình Tân, Hồ Chí Minh, Việt Nam","Khu dân cư, Nhà Bè, Hồ Chí Minh, Việt Nam","pk.eyJ1IjoiYXNkamtsenhjNjc4OSIsImEiOiJjbWR6c2UxMTYwZjVxMm1wcnR4MGw0cmhzIn0.BAwxLrh1n8erE7b59X0ANA")
print(f"Khoảng cách: {result} km")
