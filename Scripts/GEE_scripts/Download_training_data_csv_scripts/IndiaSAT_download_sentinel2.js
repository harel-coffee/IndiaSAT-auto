// Input imagery is a cloud-free Sentinel .
function maskS2clouds(image) {
  var qa = image.select('QA60');

 // Bits 10 and 11 are clouds and cirrus, respectively.
 var cloudBitMask = 1 << 10;
 var cirrusBitMask = 1 << 11;

 // Both flags should be set to zero, indicating clear conditions.
 var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
    .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

 return image.updateMask(mask);
}

//-------------------------------------------------------------------------

var bands = ['B1','B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8','B9', 'B10', 'B11','B12','B8A'];

var india = ee.FeatureCollection('users/chahatdel/India_Boundary')
    .geometry();

var india_image = ee.ImageCollection('COPERNICUS/S2') // searches all sentinel 2 imagery pixels...
  .filterBounds(india)
  .filter(ee.Filter.lt("CLOUDY_PIXEL_PERCENTAGE", 1)) // ...filters on the metadata for pixels less than 10% cloud
  .filterDate('2019-01-1' ,'2019-05-30') //... chooses only pixels between the dates you define here
  .sort('CLOUD_COVER')
  .map(maskS2clouds)
  .select(bands)  

//print(india_image);   
var india_image_training_median = india_image.median();
var india_image_training_min = india_image.min();
var india_image_training_max = india_image.max();

//Loading the training dataset
var ft = ee.FeatureCollection('users/chahatdel/traindata_14_May');


function add_normalized_bands(image){
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); //vegetaion index
  var ndwi = image.normalizedDifference(['B8', 'B12']).rename('NDWI'); //water index
  var ndbi = image.normalizedDifference(['B11', 'B8']).rename('NDBI'); //built-up index
  //var ndmi = image.normalizedDifference(['B8', 'B11']).rename('NDMI'); //moisture index
  return image.addBands(ndvi).addBands(ndwi).addBands(ndbi);
}

function add_all_bands(median_image, min_image, max_image){
  return median_image.select('B1','B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8','B9', 'B10', 'B11','B12','B8A','NDVI','NDWI','NDBI')
  .addBands(min_image.select('B2','B3','B4','NDVI','NDWI','NDBI'))
  .addBands(max_image.select('B2','B3','B4','NDVI','NDWI','NDBI'));
  
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
  description: 'IndiaSat14May_unabalanced_S2_csv', 
  assetId: 'IndiaSat14May_unabalanced_S2_csv'
});
