/*
* Copyright (c) 2019 Software AG, Darmstadt, Germany and/or its licensors
*
* SPDX-License-Identifier: Apache-2.0
*
* Licensed under the Apache License, Version 2.0 (the "License");
* you may not use this file except in compliance with the License.
* You may obtain a copy of the License at
*
*    http://www.apache.org/licenses/LICENSE-2.0
*
* Unless required by applicable law or agreed to in writing, software
* distributed under the License is distributed on an "AS IS" BASIS,
* WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
* See the License for the specific language governing permissions and
* limitations under the License.
 */
import { Component, Input, OnInit, OnDestroy, ChangeDetectionStrategy, ViewEncapsulation } from '@angular/core';
import { WidgetHelper } from "./widget-helper";
import { RawListItem, WidgetConfig } from "./widget-config";
import { IResultList, IManagedObject, IdReference, IResult, IFetchResponse } from "@c8y/client";
import { FetchClient, InventoryService } from '@c8y/ngx-components/api';
import { BehaviorSubject, from, Observable } from 'rxjs';
import { deleteDB } from 'idb';
import * as moment from "moment";
import { AlertService } from '@c8y/ngx-components';
import { get, set, has } from 'lodash';
import { FormBuilder, NgForm, Validators } from '@angular/forms';
import { DatapointAttributesFormConfig, DatapointSelectorModalOptions, KPIDetails } from '@c8y/ngx-components/datapoint-selector';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
    selector: "cumulocity-datapoints-charting-widget-config-component",
    templateUrl: "./cumulocity-datapoints-charting-widget.config.component.html",
    styleUrls: ['../../node_modules/@ng-select/ng-select/themes/default.theme.css', './cumulocity-datapoints-charting-widget.config.component.css'],
    encapsulation: ViewEncapsulation.None,
})
export class CumulocityDatapointsChartingWidgetConfig implements OnInit, OnDestroy {
    //
    // All chosen options reside in the config
    //
    @Input() config: any = {};

    datapointSelectDefaultFormOptions: Partial<DatapointAttributesFormConfig> = {
        showRange: false,
        showChart: false,
      };
      datapointSelectionConfig: Partial<DatapointSelectorModalOptions> = {};
      formGroup: ReturnType<CumulocityDatapointsChartingWidgetConfig['createForm']>;

    public CONST_HELP_IMAGE_FILE =
        "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAADAAAAAwCAYAAABXAvmHAAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAADdgAAA3YBfdWCzAAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAATzSURBVGiB7VlrTBxVFP7usLu8kUeBLSAFipUqFg1Qq5EgaCU2/DAxpYqJCVExmNC0Km1jolmbxgSCKbWoITG+oq1Ba6M1mvQHqxJTEyS0aEBiSyvIY2F5dl32Mczxh1WZndmdubOoTeD7d88995zvzH2cM/cC61jH2gZbFSs2m2B1l5VIEMoYUArgFgBZAa5GARogRj0CE7ono77uhc0mhes6rAAyD9iz/MQamUCPgZDJOXwUhA9FUWqfOXrfmFEOhgLIPtSd5JXEwwCeAhBp1Pk1eMDQ4fXCNt9WMc87mDsA68GuGiLWDiCVd6wGHAR6Zqql8lOeQfoDqP/BnJ7oageonpsaB4jw+lQs9sFWIerR1xVAqs0eJyyxUyB6IDx6+kDAV0zy7Xa0Vv2upStoKeQ3fhkpuPHFf0UeABjwIATLmVttnRYtXc0AXFFRRwGUrwozPlQ4l1JbtJRCLqH0JvseMHy0epz4QaCHQ23soAFsOHA2I4JZBkGUoNcZY8CO3CRUF1lRdGM8Yi0mAIBPlHBx2o2uwWmc6XfAJ/LkLzYLybvV0Vo1pdZrCjYsAubDPOQTos048lAB7t6cpNqfEmfBnbmJqN2RiYOfDOLilOb+vAZKZoLlZQANar2qM2A9ZM8hCb8gRIArYRIYOh7fhqKsG3RRcrp8qOnoxeKSX5c+AH8EE/PHm3eOBHaobmJaxtPQSR4AqovSFeRFidBzZR7nhufg9i/L+jbEWVC7navyMC+TSTX/KAOw2U1gqOOxvqswTdb2ixLq37+Ahg/60XjiR9S8qfza5VuSeVwAYHXY3RkRKFUEkLYkbQeQzmM6LzVW1u4amkH/b4t/tycXPbAPzch0spKjeVwAoAxrbkpxoFQRACOhgtMyEmPMsvbo7JJCx+WVVwbE6wQAoOSmts5LeM2WHPlWU6d4k3yPXJ7WewqtAENpoEhtE9/Ebzk0HinNRIE1Xib7/LyD2w4RtgTKVAJgG7kth0B1UTr278yTyfpGFnC6b8KIOQU3tSUUZ8SyGmpKMtBUlQ+2Ittcdrrx3McDkIxtgvhAgcoM0Kr8J2/LSsDzVZtl5H+dcWPvyZ94Epgm1JbQ1dUw3HBvDoQV7CcWPHjyvQuYWPCEY1bBTW0GDC3OlYiLNOGObPmp8+JnQ5hzh/3lFdyUeYDh53C9bEqJgUn45+uPz3twfmQhXLOACjdFAEToC9dPQpQ841+adodrEgDACL2BMsUpREyyM9L8UQuJc8NzupIbPyR7oETBdCq6+3uAKcrW/x9seLKlsidQqlKN2iQQnQjHlUlgaCjPwbt1t+N47W3YulFxfBsAnQSYInuo/w+Yl9sAKCsyndhTmoknyrJRmJmAu/KS8NqjhYgxKyphHrgiltGm1qEawNQr9zuI8LZRb8U5ibJ2UowZeWmxQbR14a3xVyucah1Bd6voWXoBKueuHozNySdPlMh4AmMYW4b5pWDdQQOYPb5rEYT9Rny+890oBib+TJp+UULr2UuYcfmMmAIR7XW23BO0OtCse6xNXW8QY6o3AlrYEGfBVa8Ir9/gMwDDMUdzxb5QKpoH/uQVZyMYThvx73T5DJNnDKcc0d88q6mnx9j1fLm7Nq7XV+J6e+DgLnommys7IwXTzQDaAXh5x6vAA4ZjXh8KeMkDa/WRT4Hgz6x/3fTO/VvPrOtYx1rHHxm4yOkGvwZ0AAAAAElFTkSuQmCC";
    widgetHelper: WidgetHelper<WidgetConfig>;

    //
    // source data for config
    //
    public rawDevices: BehaviorSubject<RawListItem[]>;
    public supportedSeries: BehaviorSubject<RawListItem[]>;
    selectedSeries: string;
    selectedMeasurements: RawListItem[]=[];
    selectedDevices: RawListItem[]=[];
    

    /**
     * Constructs config object and injects inventory/fetch
     * services so we can get objects and make api calls
     * @param inventory
     * @param fetchclient
     */

    private destroy$ = new Subject<void>();
    constructor(private inventory: InventoryService, private fetchclient: FetchClient, public alertService: AlertService,  private formBuilder: FormBuilder, private form: NgForm) {
        this.widgetHelper = new WidgetHelper(this.config, WidgetConfig); //default
        this.rawDevices = new BehaviorSubject<RawListItem[]>([]);
        this.supportedSeries = new BehaviorSubject<RawListItem[]>([]);
    }

    /**
     * Setup config, create the list of devices and populate
     * data for controls
     */
    async ngOnInit(): Promise<void> {
        this.widgetHelper = new WidgetHelper(this.config, WidgetConfig); //use config

        this.updateConfig();

        this.initForm();
        this.formGroup.valueChanges.pipe(takeUntil(this.destroy$)).subscribe((value) => {
            this.config.datapoints = [ ...value.datapoints ];
            this.getSelectedMeasurementsFromDatapoints();
        });
        this.getSelectedMeasurementsFromDatapoints();
    }
    /**
     * respond to changes in options, record in config
     */
    async getSelectedMeasurementsFromDatapoints(){
        this.selectedMeasurements=[];
        this.selectedDevices=[];
        this.config.datapoints?.forEach((element,i) => {
            if(element.__active==true){
                const selectedMeasurement:RawListItem = {
                    id: element.__target.id+"."+element.fragment+"."+element.series,
                    text: element.fragment+"."+element.series+"("+element.__target.name+")"
                }
                this.selectedMeasurements.push(selectedMeasurement);
                const selectedDevice : RawListItem ={
                    id: element.__target.id,
                    text: element.__target.name
                }
                if(this.selectedDevices.length>0){
                    let flag=false;
                    for(let i=0;i<this.selectedDevices.length;i++){
                        if(element.__target.id == this.selectedDevices[i].id){
                            flag=true;
                            break;
                        }
                    }
                    if(flag==false){
                        this.selectedDevices.push(selectedDevice);
                    }
                }
                else{
                    this.selectedDevices.push(selectedDevice);
                }
                
            }
            
        });
        this.updateSelectedMeasurements();
    }

    async updateSelectedMeasurements() {
        const config = this.widgetHelper.getChartConfig();
        config.clearSeries(this.selectedMeasurements);
        this.selectedMeasurements.forEach((v, i) => {
            this.widgetHelper
                .getChartConfig()
                .addSeries(
                    [v.id.toString()],
                    v.text,
                    config.colorList[i],
                    config.avgColorList[i],
                    v.groupname
                );
            //add a series for the group - this will be controlled via a flag as well...
            if (v.isGroup && !(v.groupname in config.series)) {
                config.addSeries(
                    [v.id.toString()], //create and add the source device
                    v.groupname,
                    config.colorList[i],
                    config.avgColorList[i],
                    v.groupname,
                    true
                );
            } else if (v.isGroup && v.groupname in config.series) {
                //add this device if
                config.series[v.groupname].idList.push(v.id.toString());
            }
        });
        this.widgetHelper.getWidgetConfig().selectedMeasurements=this.selectedMeasurements;
        this.widgetHelper.getWidgetConfig().selectedDevices=this.selectedDevices;
        
    }

    ngOnDestroy(): void {
        //unsubscribe from observables here
    }


    onConfigChanged(): void {
        this.widgetHelper.setWidgetConfig(this.config); //propgate changes 
       
    }


    getSelectedSeries(): string {
        return this.selectedSeries;
    }
    //
    // Helper methods
    //
   
    async getDeviceList(): Promise<IResultList<IManagedObject>> {
        const filter: object = {
            pageSize: 2000,
            withTotalPages: true,
        };

        const query = {
            name: "*",
        };

        return this.inventory.listQueryDevices(query, filter);
    }

    async getDevicesAndGroups(): Promise<IManagedObject[]> {
        let retrieved: IManagedObject[] = [];

        const filter2: object = {
            pageSize: 2000,
            withTotalPages: true,
            query: "((not(has(c8y_IsDynamicGroup.invisible))) and ((type eq 'c8y_DeviceGroup') or (type eq 'c8y_DynamicGroup') or has( c8y_IsDeviceGroup ) or has(c8y_Connection) ))",
        };

        let result = await this.inventory.list(filter2);
        if (result.res.status === 200) {
            do {
                result.data.forEach((mo) => {
                    set(mo, "isGroup", true);
                    retrieved.push(mo);
                });

                if (result.paging.nextPage) {
                    result = await result.paging.next();
                }
            } while (result.paging && result.paging.nextPage);
        }

        result = await this.getDeviceList();
        if (result.res.status === 200) {
            do {
                result.data.forEach((mo) => {
                    set(mo, "isGroup", false);
                    retrieved.push(mo);
                });

                if (result.paging.nextPage) {
                    result = await result.paging.next();
                }
            } while (result.paging && result.paging.nextPage);
        }
        return retrieved;
    }

    async getDeviceDetail(id: IdReference): Promise<IResult<IManagedObject>> {
        return this.inventory.detail(id);
    }

    async fetchSeries(id: string | number): Promise<string[]> {
        let resp: IFetchResponse = await this.fetchclient.fetch("/inventory/managedObjects/" + id + "/supportedSeries");
        let body = await resp.json();
        return body.c8y_SupportedSeries;
    }

    /**
 * map the raw devices to a list of index/name for the dropdown.
 *
 * @returns observable for the devices/groups we have retrieved
 */
    getDeviceDropdownList$(): Observable<RawListItem[]> {
        return this.rawDevices;
    }

    getSupportedSeries$(): Observable<RawListItem[]> {
        return this.supportedSeries;
    }

    async getDevicesForGroup(id: number): Promise<IManagedObject[]> {
        let retrieved: IManagedObject[] = []; //could be empty.

        //get the 3 types of children for the node at id.
        const childFilter: object = {
            pageSize: 2000,
            withTotalPages: true,
            query: "(not(has(c8y_Dashboard)))",
        };

        //get the additions
        let result: IResultList<IManagedObject> = await this.inventory.childAdditionsList(id, childFilter);

        if (result.res.status === 200) {
            do {
                result.data.forEach((mo) => {
                    if (has(mo, "c8y_IsDevice")) {
                        retrieved.push(mo);
                    }
                });

                if (result.paging.nextPage) {
                    result = await result.paging.next();
                }
            } while (result.paging && result.paging.nextPage);
        }

        //get the assets
        result = await this.inventory.childAssetsList(id, childFilter);

        if (result.res.status === 200) {
            do {
                result.data.forEach((mo) => {
                    if (has(mo, "c8y_IsAsset")) {
                        retrieved.push(mo);
                    }
                });
                if (result.paging.nextPage) {
                    result = await result.paging.next();
                }
            } while (result.paging && result.paging.nextPage);
        }

        //get the devices
        result = await this.inventory.childDevicesList(id, childFilter);

        if (result.res.status === 200) {
            do {
                result.data.forEach((mo) => {
                    retrieved.push(mo);
                });

                if (result.paging.nextPage) {
                    result = await result.paging.next();
                }
            } while (result.paging && result.paging.nextPage);
        }
        return Promise.resolve(retrieved);
    }

    /**
     * In response to the device selection get the
     * possible selections for the measurements
     * @param devices
     * @returns
     */
    async getSupportedSeries(devices: RawListItem[]): Promise<RawListItem[]> {
        let local: RawListItem[] = [];
        if (devices) {
            for (let index = 0; index < devices.length; index++) {
                const dev: RawListItem = devices[index];
                //is it a group
                if (dev.isGroup) {
                    let current: RawListItem[] = (await this.fetchSeries(dev.id)).map((m) => {
                        return {
                            id: dev.id + "." + m,
                            text: `${m}(${dev.text})`,
                            isGroup: false,
                            groupname: "default",
                        };
                    });
                    local = [...local, ...current];
                    //get the child devices and generate the list of ids to process
                    const actualDevices = await this.getDevicesForGroup(dev.id);

                    for (let index = 0; index < actualDevices.length; index++) {
                        const device = actualDevices[index];
                        let current: RawListItem[] = (await this.fetchSeries(device.id)).map((m) => {
                            return {
                                id: device.id + "." + m,
                                text: `${m}(${dev.text}/${device.name})`,
                                isGroup: true,
                                groupname: dev.text,
                            };
                        });
                        local = [...local, ...current];
                    }
                } else {
                    let current: RawListItem[] = (await this.fetchSeries(dev.id)).map((m) => {
                        return {
                            id: dev.id + "." + m,
                            text: `${m}(${dev.text})`,
                            isGroup: false,
                            groupname: "default",
                        };
                    });
                    local = [...local, ...current];
                }
            }
        }
        return local;
    }


    showSection(id: string) {
        if (this.selectedSeries === id) {
            this.selectedSeries = "";
        } else {
            this.selectedSeries = id;
        }
    }

    async clearCache() {
        let dbName = "cumulocity-datapoints-charting-widget-db";
        await deleteDB(dbName, { blocked: () => console.log(`Waiting to Removing DB ${dbName}`) });
    }

    /**
     * respond to changes in options, record in config
     */
    async updateConfig() {
        let conf = this.widgetHelper.getWidgetConfig();
        conf.changed = true;
        let chartConfig = this.widgetHelper.getChartConfig();
        // get the list of possible fragments
        if (chartConfig && conf.selectedDevices && conf.selectedDevices.length) {
            let checklist = new Set([]);

            for (let index = 0; index < conf.selectedDevices.length; index++) {
                checklist.add(conf.selectedDevices[index].id);
            }

            let newSelected: RawListItem[] = [];
            if (conf.selectedMeasurements && conf.selectedMeasurements.length) {
                for (let index = 0; index < conf.selectedMeasurements.length; index++) {
                    if (checklist.has(conf.selectedMeasurements[index].id.toString().split(".")[0])) {
                        newSelected.push(conf.selectedMeasurements[index]);
                    }
                }
            }

            this.supportedSeries.next(await this.getSupportedSeries(conf.selectedDevices));
        }

        //Formats
        const rangeUnit = chartConfig.rangeUnits[chartConfig.timeFormatType];
        let fmt = get(chartConfig.rangeDisplay, rangeUnit.text);
        if (chartConfig.customFormat) {
            fmt = chartConfig.customFormatString;
            //store custom in list
            set(chartConfig.rangeDisplay, rangeUnit.text, fmt);
        }
        chartConfig.dateExample = moment().format(fmt);
        const chartType = chartConfig.getChartType();
        //Some charts need certain defaults
        if (chartConfig.multivariateplot) {
            if (chartType !== "radar") {
                chartConfig.groupby = true;
            }
            chartConfig.realtime = "timer";
        } else {
            chartConfig.realtime = "realtime";
        }

        //Some charts need certain defaults
        if (
            (chartType === "scatter" || chartType === "bubble") &&
            chartConfig.showPoints == 0
        ) {
            chartConfig.showPoints = 4;
        }

        //Bar and horizontalBar should be time based
        if (
            chartType === "bar" ||
            chartType === "horizontalBar" ||
            chartType === "pie" ||
            chartType === "doughnut"
        ) {
            chartConfig.multivariateplot = false;
        }
        this.widgetHelper.setWidgetConfig(this.config);
    }

    private initForm(): void {
        this.formGroup = this.createForm();
        this.form.form.addControl('config', this.formGroup);
        if (this.config?.datapoints) {
          this.formGroup.patchValue({ datapoints: this.config.datapoints });
        }
      }
    
    private createForm() {
        return this.formBuilder.group({
          datapoints: this.formBuilder.control(new Array<KPIDetails>(), [
            Validators.required,
            Validators.minLength(1)
          ])
        });
      }
}