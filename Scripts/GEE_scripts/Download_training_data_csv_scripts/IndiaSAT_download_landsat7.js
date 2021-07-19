/**
 * Function to mask clouds based on the pixel_qa band of Landsat SR data.
 * @param {ee.Image} image Input Landsat SR image
 * @return {ee.Image} Cloudmasked Landsat image
 */
var cloudMaskL457 = function(image) {
  var qa = image.select('pixel_qa');
  // If the cloud bit (5) is set and the cloud confidence (7) is high
  // or the cloud shadow bit is set (3), then it's a bad pixel.
  var cloud = qa.bitwiseAnd(1 << 5)
                  .and(qa.bitwiseAnd(1 << 7))
                  .or(qa.bitwiseAnd(1 << 3));
  // Remove edge pixels that don't occur in all bands
  var mask2 = image.mask().reduce(ee.Reducer.min());
  return image.updateMask(cloud.not()).updateMask(mask2);
};


var bands = ['B1','B2', 'B3', 'B4', 'B5', 'B6','B7'];
var india = ee.FeatureCollection('users/chahatdel/India_Boundary')
    .geometry();


var india_image = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
    .filterBounds(india)
    .filterDate('2019-01-01','2019-12-31')
    .filter(ee.Filter.lt('CLOUD_COVER',1))
    .map(cloudMaskL457)
    .select(bands)
    ;

var india_image_training_median = india_image.median();
var india_image_training_min = india_image.min();
var india_image_training_max = india_image.max();

//Loading the training dataset and training the classifier
var ft = ee.FeatureCollection('users/chahatdel/traindata_14_May');

function add_normalized_bands(image){
  var ndvi = image.normalizedDifference(['B4', 'B3']).rename('NDVI'); //vegetaion index
  var ndwi = image.normalizedDifference(['B2', 'B4']).rename('NDWI'); //water index
  var ndbi = image.normalizedDifference(['B5', 'B4']).rename('NDBI'); //builtup index
  return image.addBands(ndvi).addBands(ndwi).addBands(ndbi);
}

function add_all_bands(median_image, min_image, max_image){
  return median_image.select('B1','B2','B3','B4','B5','B6','B7','NDVI','NDWI','NDBI')
  .addBands(min_image.select('B1','B2','B3','NDVI','NDWI','NDBI'))
  .addBands(max_image.select('B1','B2','B3','NDVI','NDWI','NDBI'));
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
  description: 'IndiaSat14May_unabalanced_L7_csv', 
  assetId: 'IndiaSat14May_unabalanced_L7_csv'
});
