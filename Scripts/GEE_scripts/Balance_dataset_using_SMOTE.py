from imblearn.over_sampling import SMOTE
import pandas as pd
import numpy as np
import sys


def read_data(data_file,satellite):
	df = pd.read_csv(data_file)
	if satellite == 'L7':
		X = df.iloc[:,1:23]
		Y = df.iloc[:,23:24]
	if satellite == 'L8':
		X = df.iloc[:,1:30]
		Y = df.iloc[:,30:31]
	if satellite == 'S2':
		X = df.iloc[:,1:29]
		Y = df.iloc[:,29:30]
	nan_val = df['.geo'][0]
	system_index = list(df['system:index'])
	geo_list = list(df['.geo'])
	unique_elements, counts_elements = np.unique(np.array(Y), return_counts=True)
	print('Count on unique elements :',unique_elements, counts_elements)
	return X,Y,nan_val,system_index,geo_list


def apply_SMOTE(X,Y):
	sm = SMOTE(random_state=42)
	X_smote, y_smote = sm.fit_resample(X, Y)
	return X_smote,y_smote


def rebuild_training_data(X_smote,y_smote,len_Y,system_index,geo_list,nan_val):
	index_list = []
	geo_list_gen = []
	records_to_add =  len(y_smote) - len_Y
	for index in range(101,363):
	    for sub_index in range (0,999):
	        index_list.append('00000000000000000'+str(index)+'_'+str(sub_index))
	        geo_list_gen.append(nan_val)
	        records_to_add-=1
	        if records_to_add == 0:
	                break
	    if records_to_add == 0:
	            break
	tot_index_list = system_index+index_list
	geo_tot_list   = geo_list + geo_list_gen
	X_smote.insert(0, "system:index", tot_index_list, True) 
	X_smote["class"] = y_smote
	X_smote[".geo"] = geo_tot_list

	return X_smote


def write_csv(balanced_training_data,satellite_name):
	pd.DataFrame(balanced_training_data).to_csv(satellite_name+"_balanced_training_data.csv", index=None)

# data_file = 'GEE_DataFiles/Shivani_L8_Unbalanced_training_data.csv'
# satellite = 'L8'

data_file = sys.argv[1]
satellite = sys.argv[2]

X,Y,nan_val,system_index,geo_list     = read_data(data_file,satellite)
X_smote,y_smote = apply_SMOTE(X,Y)
balanced_training_data = rebuild_training_data(X_smote,y_smote,len(Y),system_index,geo_list,nan_val)
write_csv(balanced_training_data,satellite)
print('SMOTE has been applied and data has been written in a CSV file!')




