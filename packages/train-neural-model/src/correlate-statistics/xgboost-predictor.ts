/**
 * @file xgboost-predictor.ts
 * @description XGBoost model prediction functionality.
 */
import xgboost from "xgboost_node";
import type { PredictOptions } from "./types";

/**
 * Predicts target variable for future data using the trained XGBoost model
 * @param futureData - Array of data objects for future dates
 * @param options - Prediction options including features to use
 * @returns Promise resolving to array of data objects with predictions
 * @example
 *  let futureData = [
 *    { feature1: 10, feature2: 20 },
 *    { feature1: 15, feature2: 25 }
 *  ];
 *  let options = {
 *    featuresToUse: ['feature1', 'feature2']
 *  };
 *  let predictions = await predictFuture(futureData, options);
 *  console.log(predictions);
 */
export function predictFuture(
  futureData: any[],
  options: PredictOptions
): Promise<any[]> {
  const { featuresToUse } = options;

  // Extract only the required features from future data
  let futureDataClean = futureData.map((row) => {
    return {
      ...featuresToUse.reduce((obj: any, key) => {
        obj[key] = row[key];
        return obj;
      }, {}),
    };
  });

  // Convert features to array format for XGBoost prediction
  const featureArray = futureDataClean
    .map((f) => Object.values(f))
    .map((row) => row.map(Number))
    .filter((row) => row.length > 1 && !!row[0]);

  // Make predictions using the XGBoost model
  return xgboost.predict(featureArray).then((predictions: any[]) => {
    // Add predictions back to original data objects
    futureData.forEach((row, i) => {
      row.predicted = predictions[i];
    });
    return futureData;
  });
}
