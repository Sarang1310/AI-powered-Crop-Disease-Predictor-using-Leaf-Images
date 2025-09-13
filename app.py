# app.py

import os
import json
import numpy as np
from PIL import Image
from flask import Flask, request, jsonify
from tensorflow.keras.models import load_model
import tensorflow as tf
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

print("Loading the model and class names...")
model = load_model('crop_disease_model.keras')
with open('class_names.json', 'r') as f:
    class_names = json.load(f)
print("Model and class names loaded successfully.")

def preprocess_image(image_file):
    img = Image.open(image_file.stream)
    if img.mode != 'RGB':
        img = img.convert('RGB')
    img = img.resize((180, 180))
    img_array = np.array(img)
    img_array = np.expand_dims(img_array, axis=0)
    return img_array

@app.route('/predict', methods=['POST'])
def predict():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part in the request'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected for uploading'}), 400
    
    try:
        processed_image = preprocess_image(file)
        logits = model.predict(processed_image)
        probabilities = tf.nn.softmax(logits[0])
        
        # --- MODIFIED: Get Top 3 Predictions ---
        top_k = 3
        top_indices = np.argsort(probabilities)[-top_k:][::-1]
        
        top_predictions = []
        for i in top_indices:
            prediction = {
                "disease": class_names[i],
                "confidence": float(probabilities[i])
            }
            top_predictions.append(prediction)
        
        # Check confidence of the top prediction
        top_confidence = top_predictions[0]['confidence']
        CONFIDENCE_THRESHOLD = 0.50
        if top_confidence < CONFIDENCE_THRESHOLD:
            return jsonify({
                'error': f"Prediction confidence ({top_confidence:.2%}) is too low. Please use a clearer image."
            })
        
        # Return the list of top predictions
        return jsonify(top_predictions)

    except Exception as e:
        return jsonify({'error': f'Error during prediction: {str(e)}'}), 500
    
if __name__ == '__main__':
    app.run(debug=True)