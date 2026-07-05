/**
 * @file xgboost-trainer.ts
 * @description XGBoost model training functionality.
 */
import xgboost from "xgboost_node";
import type { TrainModelOptions, TrainTestSplit } from "./types";
import { calculateR2 } from "./metrics";

/**
 * Trains an XGBoost model on preprocessed data and evaluates its performance.
 *
 * XGBoost (eXtreme Gradient Boosting) works by sequentially building decision trees
 * where each new tree corrects errors made by the ensemble of previous trees.
 * It uses gradient descent to minimize a loss function by adding trees that
 * predict the residuals or errors of prior trees, then combining them through boosting.
 * The algorithm employs regularization techniques to prevent overfitting and handles
 * missing values effectively through its sparsity-aware split finding approach.
 *
 * @param fullData - Preprocessed training data as array of objects with numeric values only
 * @param targetName - Name of the target variable column to predict
 * @param options - Configuration options for model training
 *
 * // General Parameters
 * @param options.xgbParams.verbosity - [default=1] Controls the verbosity of XGBoost's output
 *   0: silent mode (no messages)
 *   1: warnings only
 *   2: info messages
 *   3: debug messages
 *
 * // Tree Booster Parameters (Control tree structure)
 * @param options.xgbParams.max_depth - [default=6] Maximum depth of each tree
 *   Controls model complexity. Higher values create more complex trees that may overfit.
 *   Reduced from 8 to 6 to limit tree complexity and prevent overfitting.
 *
 * @param options.xgbParams.eta - [default=0.3, alias: learning_rate] Step size shrinkage
 *   Controls how much weight is given to new trees in each boosting round.
 *   Smaller values (0.1) make the model more robust by shrinking feature weights.
 *   Set to 0.1 to allow more conservative boosting, requiring more trees but improving generalization.
 *
 * @param options.xgbParams.objective - Specifies the learning task and objective
 *   'reg:squarederror': Regression with squared loss (minimize MSE)
 *   Options include classification objectives, ranking, and other regression metrics.
 *
 * @param options.xgbParams.nthread - Number of parallel threads used for training
 *   Set to 4 to utilize multi-core processing without overwhelming the system.
 *
 * @param options.xgbParams.subsample - [default=1] Fraction of training instances used per tree
 *   Values < 1 implement random sampling of the training data for each tree.
 *   Set to 0.9 to reduce overfitting by introducing randomness while using most of the data.
 *
 * @param options.xgbParams.colsample_bytree - [default=1] Fraction of features used per tree
 *   Controls feature sampling for each tree, similar to Random Forest.
 *   Set to 0.9 to reduce overfitting and create diverse trees.
 *
 * @param options.xgbParams.min_child_weight - [default=1] Minimum sum of instance weight in a child
 *   Controls the minimum number of instances needed in a leaf node.
 *   Set to 3 to prevent the model from creating overly specific rules based on few samples.
 *
 * @param options.xgbParams.gamma - [default=0, alias: min_split_loss] Minimum loss reduction for a split
 *   Controls the minimum reduction in the loss function required to make a split.
 *   Set to 0.1 to make splitting more conservative and reduce overfitting.
 *
 * // Regularization Parameters
 * @param options.xgbParams.alpha - [default=0, alias: reg_alpha] L1 regularization on weights
 *   Encourages sparsity by penalizing non-zero weights (feature selection).
 *   Set to 0 as gamma is being used for regularization.
 *
 * @param options.xgbParams.lambda - [default=1, alias: reg_lambda] L2 regularization on weights
 *   Penalizes large weights to prevent overfitting (similar to Ridge regression).
 *   Default value of 1 provides moderate regularization.
 *
 * // Learning Control Parameters
 * @param options.xgbParams.early_stopping_rounds - Stop training if performance doesn't improve
 *   Stops adding trees when the validation metric doesn't improve for specified rounds.
 *   Set to 20 to prevent overfitting by stopping when the model stops improving.
 *
 * @param options.xgbParams.seed - [default=0] Random number seed for reproducibility
 *   Set to 42 to ensure consistent results across training runs.
 *
 * @param options.xgbParams.nrounds - Number of boosting rounds (trees to build)
 *   Set to 1000 to compensate for the lower learning rate (eta),
 *   allowing the model to converge slowly but more accurately.
 *
 * @param options.testSize - Proportion of data to use for testing (default: 0.2)
 * @param options.featuresToUse - Specific feature columns to use for training
 * @see [XGBoost_parameters](https://xgboost.readthedocs.io/en/release_3.0.0/parameter.html)
 * @author [vtempest](https://github.com/vtempest)
 * @license MIT
 * @returns R² value (coefficient of determination) indicating model accuracy
 * @example
 *  let data = [
 *    {
 *      "feature1": 1,
 *      "feature2": 2,
 *      "target": 3
 *    }
 *  ];
 *  let options = {
 *    xgbParams: {
 *      verbosity: 0,
 *      max_depth: 7,
 *      eta: 0.07,
 *      objective: 'reg:squarederror',
 *      nthread: 4,
 *    }
 *  };
 *  let accuracy = await trainModels(data, 'target', options);
 *  console.log(accuracy);
 */
export async function trainModels(
  fullData: any[],
  targetName: string,
  options: TrainModelOptions
): Promise<number> {
  const {
    xgbParams = {
      verbosity: 0,
      max_depth: 7, // Slightly increased with stronger regularization
      eta: 0.07, // Reduced learning rate for better convergence
      objective: "reg:squarederror",
      nthread: 4,
      subsample: 0.85, // Added stochasticity while maintaining data leverage
      colsample_bytree: 0.8, // More conservative feature sampling
      colsample_bylevel: 0.8, // Additional per-level sampling
      min_child_weight: 5, // Stronger protection against small leaves
      gamma: 0.2, //   Increased split cost regularization
      alpha: 0.1, // Mild L1 regularization
      lambda: 1.5, // Stronger L2 regularization
      early_stopping_rounds: 50, // More patience for validation improvements
      seed: 42,
      nrounds: 2000, // Increased with safer early stopping
      tree_method: "hist", // Optimized for speed/accuracy balance
      grow_policy: "depthwise", // Conservative growth strategy
      ...options.xgbParams,
    },
    testSize = 0.1,
    featuresToUse,
  } = options;

  // Extract features and target variables
  const features = fullData
    .map((row) => {
      return {
        ...featuresToUse.reduce((obj: any, key) => {
          obj[key] = row[key];
          return obj;
        }, {}),
      };
    })
    .filter((f) => Object.values(f).length > 0);

  let featureArray = features.map((f) => Object.values(f));

  featureArray = featureArray.map((row: any[]) => row.map(Number));
  const target = fullData.map((row) => row[targetName]);

  // Split data into training and testing sets
  const { trainFeatures, testFeatures, trainTarget, testTarget } =
    splitTrainTest(featureArray, target, testSize);

  // Prepare feature arrays for training
  const trainFeatureArray = Object.values(trainFeatures)
    .map((f) => Object.values(f))
    .map((row: any) => row.map(Number));
  const testFeatureArray = Object.values(testFeatures)
    .map((f) => Object.values(f))
    .map((row: any) => row.map(Number));

  // Remove NaN values from training data
  const validIndices: number[] = [];
  for (let i = 0; i < trainTarget.length; i++) {
    if (!isNaN(trainTarget[i])) {
      validIndices.push(i);
    }
  }

  const trainFeaturesClean = validIndices.map((i) => trainFeatureArray[i]);
  const trainTargetClean = validIndices.map((i) => trainTarget[i]);

  // Train model
  await xgboost.train(trainFeaturesClean, trainTargetClean, xgbParams);

  //  evaluate performance
  const accuracy = calculateR2(
    await xgboost.predict(testFeatureArray),
    testTarget
  );

  return accuracy;
}

/**
 * Splits data into training and testing sets
 * @param features - Feature array
 * @param target - Target array
 * @param testSize - Proportion of data to use for testing
 * @returns Split datasets
 */
export function splitTrainTest(
  features: any[][],
  target: any[],
  testSize: number = 0.2
): TrainTestSplit {
  const totalSize = features.length;
  const testCount = Math.floor(totalSize * testSize);
  const trainCount = totalSize - testCount;

  // Shuffle indices
  const indices = Array.from({ length: totalSize }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }

  // Split data
  const trainIndices = indices.slice(0, trainCount);
  const testIndices = indices.slice(trainCount);

  return {
    trainFeatures: trainIndices.map((i) => features[i]),
    testFeatures: testIndices.map((i) => features[i]),
    trainTarget: trainIndices.map((i) => target[i]),
    testTarget: testIndices.map((i) => target[i]),
  };
}
