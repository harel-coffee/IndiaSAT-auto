var cloud_masks = require('users/fitoprincipe/geetools:cloud_masks');
var maskClouds_SR = cloud_masks.landsatSR();

//------------------Select image for training--------------------------------------------------
var bands = ['B1','B2', 'B3', 'B4', 'B5', 'B6','B7'];

var india = ee.FeatureCollection('users/chahatdel/India_Boundary')
    .geometry();


var india_image_sr = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
    .filterBounds(india)
    .filterDate('2019-01-01','2019-12-31')
    .filter(ee.Filter.lt('CLOUD_COVER',1))
    .sort('CLOUD_COVER')
    .map(maskClouds_SR)
    .select(bands)
    ;

var india_image_training_median = india_image_sr.median();
var india_image_training_min = india_image_sr.min();
var india_image_training_max = india_image_sr.max();



//------------------Training the classifier ---------------------------------------------------------------

//Loading the training dataset
var ft = ee.FeatureCollection('users/chahatdel/traindata_14_May');


function add_normalized_bands(image){
  var ndvi = image.normalizedDifference(['B5', 'B4']).rename('NDVI'); //vegetaion index
  var ndmi = image.normalizedDifference(['B5', 'B6']).rename('NDMI'); //moisture index
  var ndwi = image.normalizedDifference(['B3', 'B6']).rename('NDWI'); //water index
  var ndbi = image.normalizedDifference(['B6', 'B5']).rename('NDBI'); //builtup index
  return image.addBands(ndvi).addBands(ndwi).addBands(ndbi).addBands(ndmi);
}

function add_all_bands(median_image, min_image, max_image){
  return median_image.select('B1','B2','B3','B4','B5','B6','NDVI','NDWI','NDBI','NDMI')
  .addBands(min_image.select('B1','B2','B3','B4','B5','B6','NDVI','NDMI','NDWI','NDBI'))
  .addBands(max_image.select('B1','B2','B3','B4','B5','B6','NDWI','NDVI','NDMI'));  
}

india_image_training_median = add_normalized_bands(india_image_training_median)
india_image_training_min = add_normalized_bands(india_image_training_min)
india_image_training_max = add_normalized_bands(india_image_training_max)

var india_image_training = add_all_bands(india_image_training_median,
                                          india_image_training_min,
                                          india_image_training_max);

// Training the RF model.
var training = india_image_training.sampleRegions(ft,['class'],30);

Export.table.toAsset({
  collection: training, 
  description: 'IndiaSat14May_unabalanced_L8_csv', 
  assetId: 'IndiaSat14May_unabalanced_L8_csv'
});
