import requests
from bs4 import BeautifulSoup
import os

# Function to scrape a website and extract specific elements
def scrape_player_links(url):
    # Send a GET request to the website
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Parse the HTML content using BeautifulSoup
        soup = BeautifulSoup(response.content, 'html.parser')

        # Find all <td> elements with data-th="Player"
        td_elements = soup.find_all('td', {'data-th': 'Player'})

        # Extract the <a> elements inside the found <td> elements
        player_links = [td.find('a')['href'] for td in td_elements if td.find('a')]

        return player_links
    else:
        print(f"Failed to retrieve the webpage. Status code: {response.status_code}")
        return []

# Function to download an image from a URL
def download_image(url, save_path):
    # Create directory if it doesn't exist
    os.makedirs('./player_images', exist_ok=True)
    
    # Send a GET request to the image URL
    response = requests.get(url)

    # Check if the request was successful
    if response.status_code == 200:
        # Open a file in binary write mode and save the image content
        with open(f"./player_images/{save_path}", 'wb') as file:
            file.write(response.content)
        print(f"Image successfully downloaded: ./player_images/{save_path}")
    else:
        print(f"Failed to retrieve the image. Status code: {response.status_code}")

# Function to scrape images from player links
def scrape_images(player_links):
    base_url = 'https://basketball.realgm.com'
    for player_link in player_links:
        # Send a GET request to the player's page
        response = requests.get(base_url + player_link)

        # Check if the request was successful
        if response.status_code == 200:
            # Parse the HTML content using BeautifulSoup
            soup = BeautifulSoup(response.content, 'html.parser')

            # Find the player's image with the specific style
            image = soup.find('img', {'style': 'border: 1px solid #000; float: left; margin-right: 15px; margin-top:5px;'})

            if image:
                # Extract the image source URL
                src = image['src']
                # Extract and format the filename from the image URL
                x = src.split('/')[-1].split('_')
                filename = f"{x[1]}-{x[0]}.jpg"  # save under player name

                # Download the image
                download_image(base_url + src, filename)
            else:
                print(f"No image found for {player_link}")
        else:
            print(f"Failed to retrieve the player's page. Status code: {response.status_code}")

# Example usage
url = 'https://basketball.realgm.com/nba/players'
player_links = scrape_player_links(url)

# Scrape and download images for all player links
scrape_images(player_links)

