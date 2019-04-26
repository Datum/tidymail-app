import { Pipe, PipeTransform } from '@angular/core';

@Pipe({name: 'groupByExpression'})
export class GroupByExpressionPipe implements PipeTransform {
    transform(collection: any, property: any): any {
        // prevents the application from breaking if the array of objects doesn't exist yet
        if(!collection) {
            return null;
        }

        const groupedCollection = collection.reduce((previous, current)=> {
            var value = eval(property.exp);
            if(!previous[value]) {
                previous[value] = [current];
            } else {
                previous[value].push(current);
            }

            return previous;
        }, {});

     
        var suffix = property.suffix === undefined ? "" : property.suffix;
        var prefix = property.prefix === undefined ? "" : property.prefix;

        // this will return an array of objects, each object containing a group of objects
        var ret = Object.keys(groupedCollection).map(key => ({ key : prefix + key + suffix, value: groupedCollection[key] }));
        if(property.reverse === true) {
            ret = ret.reverse();
        }
        return ret;
    }
}