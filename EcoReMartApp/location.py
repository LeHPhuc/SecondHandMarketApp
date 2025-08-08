# utils/geolocation.py
import requests
from urllib.parse import quote
def is_valid_address(address, api_key):
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"


    params = {
        "access_token": api_key,
        "limit": 1,
        'country': 'VN'
    }

    try:
        response = requests.get(url, params=params)
        data = response.json()
        # Nếu có ít nhất 1 kết quả -> hợp lệ
        return len(data.get("features", [])) > 0
    except requests.exceptions.RequestException:
        return False


def get_coordinates(address, api_key):
    url = f"https://api.mapbox.com/geocoding/v5/mapbox.places/{address}.json"
    params = {
        "access_token": api_key,
        "limit": 1
    }
    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        features = data.get("features")
        if features:
            coords = features[0]["center"]
            return coords
    return None


def get_directions_distance(start_address, end_address, api_key):
    start_coord = get_coordinates(start_address, api_key)
    end_coord = get_coordinates(end_address, api_key)

    if not start_coord or not end_coord:
        print("Không lấy được tọa độ")
        return None

    # URL for Mapbox Directions API
    directions_url = f"https://api.mapbox.com/directions/v5/mapbox/driving/{start_coord[0]},{start_coord[1]};{end_coord[0]},{end_coord[1]}"
    params = {
        "access_token": api_key,
        "geometries": "geojson",
        "overview": "full"
    }

    response = requests.get(directions_url, params=params)

    if response.status_code == 200:
        data = response.json()
        try:
            distance_meters = data["routes"][0]["distance"]
            distance_km = distance_meters / 1000  # convert to km
            return distance_km
        except (IndexError, KeyError):
            print("Không có route nào được trả về từ Mapbox Directions API")
            return None
    else:
        print(f"Lỗi khi gọi Directions API: {response.status_code} - {response.text}")
        return None

def ship_fee_cost(distance_km):
    if distance_km <= 5:
        return 0
    elif distance_km <= 150:
        return 20000
    elif distance_km <= 600:
        return 30000
    else:
        return 30000 + int((distance_km - 600) * 100)
