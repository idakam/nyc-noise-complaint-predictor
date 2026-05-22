# Project Summary

Noise is a persistent quality-of-life issue in New York City, with millions of noise complaints submitted through the 311 system each year. Due to the high volume and reactive nature of complaint handling, city agencies such as the NYC Department of Environmental Protection have faced challenges in efficiently allocating enforcement resources. With over 4.6 million noise complaints filed between 2020 and 2026, there was a need for a predictive tool to anticipate when and where complaints are most likely to occur.

# Solution Overview

This project introduces a machine learning–based prediction system that forecasts weekly noise complaint volumes by neighborhood, time of day, day of week, and season. A Random Forest regression model achieves a Mean Absolute Error of ±2.8 complaints per week, enabling reliable forecasting. The predictions are delivered through an interactive Streamlit dashboard that allows analysts to explore future complaint patterns and identify high-risk periods for proactive resource planning.

# Tech Stack

- Python 3.8+
- Pandas / NumPy
- Scikit-learn
- Jupyter Notebook
- Streamlit
- Random Forest Regression
- NYC 311 Open Data

# Installation & Local Setup Guide

## Prerequisites

Make sure the following are installed on your machine:

- Python 3.8 or higher
- Git
- Clone the Repository

## Installation

1. Open your terminal and run:


    `git clone https://github.com/idakam/nyc-noise-complaint-predictor.git`

    `cd nyc-noise-complaint-predictor`



2. Create a Virtual Environment

    `python3 -m venv venv`

3. Activate the Virtual Environment

    Mac / Linux: `source venv/bin/activate`

    Windows: `venv\Scripts\activate`

4. Install Dependencies

    `pip install -r requirements.txt`

5. Register the virtual environment as a Jupyter kernel:

    `python3 -m ipykernel install --user --name=noiseproject --display-name "Python (NoiseProject)"`
6. From the project root directory, launch Jupyter:

    `jupyter notebook notebooks/`

7. For each notebook:

    - Open the notebook

    - Click Select Kernel (top-right)

    - Choose **Python (NoiseProject)**


    NOTE: The notebooks must be run sequentially — each notebook generates files used by the next.

    - Notebook 01 – Data Loading & Cleaning

    - Notebook 02 – Exploratory Data Analysis

    - Notebook 03 – Feature Engineering

    - Notebook 04 – Model Training

8. Launching the Web Application
    
    `streamlit run app.py`

    Streamlit will start a local server and automatically open the dashboard in your default browser.

    Example URL:

    http://localhost:8501
